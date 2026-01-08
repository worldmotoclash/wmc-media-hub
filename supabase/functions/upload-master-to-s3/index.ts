import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";
import { getS3Config, getCdnUrl, S3_PATHS } from '../_shared/s3Config.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WMC_CONTENT_API = "https://api.realintelligence.com/api/wmc-content-master.py";
const W2X_ENGINE_URL = "https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php";
const ORG_ID = "00D5e000000HEcP";

interface UploadMasterRequest {
  imageBase64: string;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  title?: string;
  creatorContactId?: string;
  thumbnailBase64?: string; // Optional thumbnail for video uploads
}

// Helper function to escape special regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Query the wmc-content-master API to find a Salesforce ID by matching URL
async function findSalesforceIdByUrl(cdnUrl: string, maxAttempts = 3): Promise<string | null> {
  console.log(`Searching for Salesforce ID matching URL: ${cdnUrl}`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Wait before querying (give Salesforce time to propagate the new record)
      const delayMs = 2000 * attempt;
      console.log(`Attempt ${attempt}/${maxAttempts}: Waiting ${delayMs}ms before querying API...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      const apiUrl = `${WMC_CONTENT_API}?orgId=${ORG_ID}&sandbox=False`;
      console.log(`Querying API: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error(`API request failed: ${response.status}`);
        continue;
      }
      
      const xmlText = await response.text();
      console.log(`API response length: ${xmlText.length} characters`);
      
      // Parse XML to find content record with matching URL
      // The XML structure is: <content><id>...</id><url><![CDATA[...]]></url>...</content>
      const escapedUrl = escapeRegExp(cdnUrl);
      
      // Try multiple patterns to match the URL
      const patterns = [
        // Pattern 1: URL in CDATA
        new RegExp(`<content>.*?<id>([^<]+)</id>.*?<url><!\\[CDATA\\[${escapedUrl}\\]\\]></url>.*?</content>`, 's'),
        // Pattern 2: URL without CDATA
        new RegExp(`<content>.*?<id>([^<]+)</id>.*?<url>${escapedUrl}</url>.*?</content>`, 's'),
        // Pattern 3: ID after URL (different order)
        new RegExp(`<content>.*?<url><!\\[CDATA\\[${escapedUrl}\\]\\]></url>.*?<id>([^<]+)</id>.*?</content>`, 's'),
        new RegExp(`<content>.*?<url>${escapedUrl}</url>.*?<id>([^<]+)</id>.*?</content>`, 's'),
      ];
      
      for (const pattern of patterns) {
        const match = xmlText.match(pattern);
        if (match && match[1]) {
          const salesforceId = match[1].trim();
          console.log(`Found Salesforce ID: ${salesforceId} (attempt ${attempt})`);
          return salesforceId;
        }
      }
      
      // If patterns didn't work, try a simpler approach: find all content blocks and check URLs
      const contentBlocks = xmlText.match(/<content>[\s\S]*?<\/content>/g) || [];
      console.log(`Found ${contentBlocks.length} content blocks, searching for URL match...`);
      
      for (const block of contentBlocks) {
        // Check if this block contains our URL
        if (block.includes(cdnUrl)) {
          // Extract ID from this block
          const idMatch = block.match(/<id>([^<]+)<\/id>/);
          if (idMatch && idMatch[1]) {
            const salesforceId = idMatch[1].trim();
            console.log(`Found Salesforce ID via block search: ${salesforceId}`);
            return salesforceId;
          }
        }
      }
      
      console.log(`URL not found in API response (attempt ${attempt})`);
    } catch (error) {
      console.error(`Error querying API (attempt ${attempt}):`, error);
    }
  }
  
  console.log(`Failed to find Salesforce ID after ${maxAttempts} attempts`);
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: UploadMasterRequest = await req.json();
    console.log("Processing master image upload:", {
      filename: payload.filename,
      mimeType: payload.mimeType,
      dimensions: `${payload.width}x${payload.height}`,
    });

    const { imageBase64, filename, mimeType, width, height, title, creatorContactId, thumbnailBase64 } = payload;

    if (!imageBase64 || !filename || !width || !height) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: imageBase64, filename, width, height" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect if this is a video or image based on mimeType
    const isVideo = mimeType?.startsWith('video/');
    const fileExtension = filename.split('.').pop()?.toLowerCase() || (isVideo ? 'mp4' : 'jpg');
    const assetType = isVideo ? 'video' : 'master_image';

    console.log(`Detected media type: ${assetType}, extension: ${fileExtension}, isVideo: ${isVideo}`);

    const s3Config = getS3Config();
    
    if (!s3Config.accessKeyId || !s3Config.secretAccessKey) {
      console.error("Missing Wasabi credentials");
      return new Response(
        JSON.stringify({ error: "S3 credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aws = new AwsClient({
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
      region: s3Config.region,
      service: "s3",
    });

    const masterId = crypto.randomUUID();
    const s3Key = `${S3_PATHS.SOCIAL_MEDIA_MASTERS}/${masterId}/master.${fileExtension}`;

    // Upload thumbnail for videos if provided
    let thumbnailUrl: string | null = null;
    if (isVideo && thumbnailBase64) {
      const thumbKey = `${S3_PATHS.SOCIAL_MEDIA_MASTERS}/${masterId}/thumbnail.jpg`;
      const thumbData = Uint8Array.from(atob(thumbnailBase64), c => c.charCodeAt(0));
      const thumbUploadUrl = `${s3Config.endpoint}/${s3Config.bucketName}/${thumbKey}`;
      
      console.log("Uploading video thumbnail to S3:", thumbUploadUrl);
      
      const thumbResponse = await aws.fetch(thumbUploadUrl, {
        method: "PUT",
        body: thumbData,
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": thumbData.length.toString(),
        },
      });
      
      if (thumbResponse.ok) {
        thumbnailUrl = getCdnUrl(thumbKey);
        console.log("Thumbnail uploaded successfully:", thumbnailUrl);
      } else {
        console.warn("Thumbnail upload failed, will use video URL as fallback");
      }
    }

    const fileData = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));

    const uploadUrl = `${s3Config.endpoint}/${s3Config.bucketName}/${s3Key}`;

    console.log("Uploading to S3:", uploadUrl);

    const uploadResponse = await aws.fetch(uploadUrl, {
      method: "PUT",
      body: fileData,
      headers: {
        "Content-Type": mimeType || "image/jpeg",
        "Content-Length": fileData.length.toString(),
      },
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("S3 upload failed:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to upload to S3", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cdnUrl = getCdnUrl(s3Key);
    console.log("S3 upload successful, CDN URL:", cdnUrl);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const imageTitle = title || filename.replace(/\.[^/.]+$/, "");
    
    // Initial metadata with sync status
    const initialMetadata = {
      width,
      height,
      originalFilename: filename,
      mimeType,
      masterId,
      uploadedAt: new Date().toISOString(),
      isMasterImage: true,
      sfdcSyncStatus: 'pending' as const,
      creatorContactId,
    };

    const { data: assetData, error: assetError } = await supabase
      .from("media_assets")
      .insert({
        title: imageTitle,
        file_url: cdnUrl,
        thumbnail_url: thumbnailUrl || cdnUrl, // Use separate thumbnail for videos
        source: "local_upload",
        status: "ready",
        file_format: fileExtension,
        asset_type: assetType,
        s3_key: s3Key,
        metadata: initialMetadata,
      })
      .select()
      .single();

    if (assetError) {
      console.error("Failed to create asset record:", assetError);
      return new Response(
        JSON.stringify({ error: "Failed to create media asset record", details: assetError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Created media_assets record:", assetData.id);

    // === SALESFORCE SYNC ===
    let salesforceId: string | null = null;
    let sfdcSyncStatus: 'success' | 'failed' = 'failed';
    let sfdcSyncError: string | null = null;

    try {
      const fileExtension = filename.split('.').pop()?.toUpperCase() || 'JPG';
      
      const formData = new FormData();
      formData.append("retURL", "https://worldmotoclash.com");
      formData.append("sObj", "ri1__Content__c");
      formData.append("string_Name", imageTitle);
      formData.append("string_ri1__Content_Type__c", fileExtension);
      formData.append("string_ri1__URL__c", cdnUrl);
      
      // Link to creator Contact if provided
      if (creatorContactId) {
        formData.append("lookup_ri1__Contact__c", creatorContactId);
        console.log(`Linking content to creator Contact: ${creatorContactId}`);
      }

      console.log("=== SALESFORCE SYNC START ===");
      console.log("Sending to w2x-engine:", W2X_ENGINE_URL);
      console.log("FormData: Name=" + imageTitle + ", Content_Type=" + fileExtension + ", URL=" + cdnUrl);

      const sfResponse = await fetch(W2X_ENGINE_URL, {
        method: "POST",
        body: formData,
      });

      const sfResponseText = await sfResponse.text();
      console.log("w2x-engine response status:", sfResponse.status);
      console.log("w2x-engine response body:", sfResponseText.substring(0, 500));

      if (sfResponse.ok) {
        console.log("w2x-engine call successful, now querying API to find Salesforce ID...");
        
        // Query the API to find the newly created record by URL
        salesforceId = await findSalesforceIdByUrl(cdnUrl, 3);
        
        if (salesforceId) {
          sfdcSyncStatus = 'success';
          console.log("Successfully retrieved Salesforce ID:", salesforceId);
          
          // Update the media_assets record with the Salesforce ID
          await supabase
            .from("media_assets")
            .update({ 
              salesforce_id: salesforceId,
              metadata: {
                ...initialMetadata,
                sfdcSyncStatus: 'success',
                sfdcSyncedAt: new Date().toISOString(),
              }
            })
            .eq("id", assetData.id);
        } else {
          sfdcSyncError = "Record created but ID not found in API response";
          console.warn("SFDC record may have been created but couldn't find matching ID in API");
          
          // Update metadata to reflect partial sync
          await supabase
            .from("media_assets")
            .update({
              metadata: {
                ...initialMetadata,
                sfdcSyncStatus: 'failed',
                sfdcSyncError,
                sfdcSyncAttemptedAt: new Date().toISOString(),
              }
            })
            .eq("id", assetData.id);
        }
      } else {
        sfdcSyncError = `w2x-engine returned status ${sfResponse.status}: ${sfResponseText.substring(0, 200)}`;
        console.error("w2x-engine call failed:", sfdcSyncError);
        
        await supabase
          .from("media_assets")
          .update({
            metadata: {
              ...initialMetadata,
              sfdcSyncStatus: 'failed',
              sfdcSyncError,
              sfdcSyncAttemptedAt: new Date().toISOString(),
            }
          })
          .eq("id", assetData.id);
      }
      
      console.log("=== SALESFORCE SYNC END ===");
    } catch (sfError) {
      sfdcSyncError = sfError instanceof Error ? sfError.message : "Unknown error during SFDC sync";
      console.error("Salesforce sync error:", sfError);
      
      await supabase
        .from("media_assets")
        .update({
          metadata: {
            ...initialMetadata,
            sfdcSyncStatus: 'failed',
            sfdcSyncError,
            sfdcSyncAttemptedAt: new Date().toISOString(),
          }
        })
        .eq("id", assetData.id);
    }

    // === AUTO-TAGGING ===
    // Trigger auto-tagging in the background (don't wait for it)
    console.log("Triggering auto-tagging for asset:", assetData.id);
    const autoTagUrl = `${supabaseUrl}/functions/v1/auto-tag-media-asset`;
    
    EdgeRuntime.waitUntil(
      fetch(autoTagUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          assetId: assetData.id,
          mediaUrl: cdnUrl,
          mediaType: isVideo ? 'video' : 'image',
        }),
      }).then(res => {
        console.log(`Auto-tagging response status: ${res.status}`);
        return res.json();
      }).then(result => {
        console.log("Auto-tagging result:", result);
      }).catch(err => {
        console.error("Auto-tagging error:", err);
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        masterId,
        assetId: assetData.id,
        cdnUrl,
        s3Key,
        salesforceId,
        sfdcSyncStatus,
        sfdcSyncError: sfdcSyncStatus === 'failed' ? sfdcSyncError : undefined,
        dimensions: { width, height },
        autoTaggingQueued: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error uploading master image:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

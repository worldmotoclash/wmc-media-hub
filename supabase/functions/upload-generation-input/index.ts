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

interface UploadRequest {
  imageBase64: string;
  filename: string;
  mimeType: string;
  userId?: string;
  title?: string;
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
      const delayMs = 2000 * attempt;
      console.log(`Attempt ${attempt}/${maxAttempts}: Waiting ${delayMs}ms before querying API...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      const apiUrl = `${WMC_CONTENT_API}?orgId=${ORG_ID}&sandbox=False`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        console.error(`API request failed: ${response.status}`);
        continue;
      }
      
      const xmlText = await response.text();
      const escapedUrl = escapeRegExp(cdnUrl);
      
      // Try multiple patterns to match the URL
      const patterns = [
        new RegExp(`<content>.*?<id>([^<]+)</id>.*?<url><!\\[CDATA\\[${escapedUrl}\\]\\]></url>.*?</content>`, 's'),
        new RegExp(`<content>.*?<id>([^<]+)</id>.*?<url>${escapedUrl}</url>.*?</content>`, 's'),
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
      
      // Fallback: search content blocks
      const contentBlocks = xmlText.match(/<content>[\s\S]*?<\/content>/g) || [];
      for (const block of contentBlocks) {
        if (block.includes(cdnUrl)) {
          const idMatch = block.match(/<id>([^<]+)<\/id>/);
          if (idMatch && idMatch[1]) {
            return idMatch[1].trim();
          }
        }
      }
      
      console.log(`URL not found in API response (attempt ${attempt})`);
    } catch (error) {
      console.error(`Error querying API (attempt ${attempt}):`, error);
    }
  }
  
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: UploadRequest = await req.json();
    console.log("Processing generation input upload:", {
      filename: payload.filename,
      mimeType: payload.mimeType,
    });

    const { imageBase64, filename, mimeType, userId, title } = payload;

    if (!imageBase64 || !filename) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: imageBase64, filename" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const s3Config = getS3Config();
    
    if (!s3Config.accessKeyId || !s3Config.secretAccessKey) {
      console.error("Missing Wasabi credentials");
      return new Response(
        JSON.stringify({ error: "S3 credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fileId = crypto.randomUUID();
    const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const s3Key = `${S3_PATHS.GENERATION_INPUTS}/${fileId}.${extension}`;

    const aws = new AwsClient({
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
      region: s3Config.region,
      service: "s3",
    });

    const imageData = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));

    const uploadUrl = `${s3Config.endpoint}/${s3Config.bucketName}/${s3Key}`;

    console.log("Uploading to S3:", uploadUrl);

    const uploadResponse = await aws.fetch(uploadUrl, {
      method: "PUT",
      body: imageData,
      headers: {
        "Content-Type": mimeType || "image/jpeg",
        "Content-Length": imageData.length.toString(),
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

    // === Create media_assets record ===
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const imageTitle = title || filename.replace(/\.[^/.]+$/, "");
    
    const initialMetadata = {
      originalFilename: filename,
      mimeType,
      fileId,
      uploadedAt: new Date().toISOString(),
      isMasterImage: true,
      generationInput: true,
      sfdcSyncStatus: 'pending' as const,
    };

    const { data: assetData, error: assetError } = await supabase
      .from("media_assets")
      .insert({
        title: imageTitle,
        file_url: cdnUrl,
        thumbnail_url: cdnUrl,
        source: "local_upload",
        status: "ready",
        file_format: extension,
        asset_type: "master_image",
        s3_key: s3Key,
        created_by: userId || null,
        metadata: initialMetadata,
      })
      .select()
      .single();

    if (assetError) {
      console.error("Failed to create asset record:", assetError);
      // Continue without failing - S3 upload was successful
    } else {
      console.log("Created media_assets record:", assetData.id);
    }

    // === SALESFORCE SYNC ===
    let salesforceId: string | null = null;
    let sfdcSyncStatus: 'success' | 'failed' = 'failed';

    try {
      const fileExtension = extension.toUpperCase();
      
      const formData = new FormData();
      formData.append("retURL", "https://worldmotoclash.com");
      formData.append("sObj", "ri1__Content__c");
      formData.append("string_Name", imageTitle);
      formData.append("string_ri1__Content_Type__c", fileExtension);
      formData.append("string_ri1__URL__c", cdnUrl);

      console.log("=== SALESFORCE SYNC START ===");
      console.log("Sending to w2x-engine:", W2X_ENGINE_URL);

      const sfResponse = await fetch(W2X_ENGINE_URL, {
        method: "POST",
        body: formData,
      });

      const sfResponseText = await sfResponse.text();
      console.log("w2x-engine response status:", sfResponse.status);

      if (sfResponse.ok) {
        console.log("w2x-engine call successful, querying API for Salesforce ID...");
        salesforceId = await findSalesforceIdByUrl(cdnUrl, 3);
        
        if (salesforceId && assetData?.id) {
          sfdcSyncStatus = 'success';
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
          console.log("Successfully updated with Salesforce ID:", salesforceId);
        } else if (assetData?.id) {
          await supabase
            .from("media_assets")
            .update({
              metadata: {
                ...initialMetadata,
                sfdcSyncStatus: 'failed',
                sfdcSyncError: "Record created but ID not found",
                sfdcSyncAttemptedAt: new Date().toISOString(),
              }
            })
            .eq("id", assetData.id);
        }
      } else {
        console.error("w2x-engine call failed:", sfResponse.status);
      }
      
      console.log("=== SALESFORCE SYNC END ===");
    } catch (sfError) {
      console.error("Salesforce sync error:", sfError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        fileId,
        cdnUrl,
        s3Key,
        assetId: assetData?.id || null,
        salesforceId,
        sfdcSyncStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error uploading generation input:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

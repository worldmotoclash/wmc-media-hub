import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";
import { getS3Config, getCdnUrl, S3_PATHS } from '../_shared/s3Config.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// API endpoints
const WMC_CONTENT_API = "https://api.realintelligence.com/api/wmc-content.py";
const W2X_ENGINE_URL = "https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php";
const UPDATE_ENGINE_URL = "https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/update-engine-content.php";
const ORG_ID = "00D5e000000HEcP";

interface CreateThumbnailRequest {
  videoSalesforceId: string;      // e.g., "a2FDm000000948N"
  videoTitle: string;              // e.g., "Josh Herrin On Racing"
  thumbnailImageBase64: string;    // Base64 encoded image data
  mimeType?: string;               // Default: "image/jpeg"
}

// Helper function to escape special regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Query the wmc-content API to find a Salesforce ID by matching URL
async function findSalesforceIdByUrl(cdnUrl: string, maxAttempts = 5): Promise<string | null> {
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
    const payload: CreateThumbnailRequest = await req.json();
    console.log("=== CREATE VIDEO THUMBNAIL START ===");
    console.log("Processing thumbnail creation for video:", {
      videoSalesforceId: payload.videoSalesforceId,
      videoTitle: payload.videoTitle,
      imageDataLength: payload.thumbnailImageBase64?.length || 0,
    });

    const { videoSalesforceId, videoTitle, thumbnailImageBase64, mimeType = "image/jpeg" } = payload;

    // Validate required fields
    if (!videoSalesforceId || !videoTitle || !thumbnailImageBase64) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: videoSalesforceId, videoTitle, thumbnailImageBase64" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get S3 configuration
    const s3Config = getS3Config();
    
    if (!s3Config.accessKeyId || !s3Config.secretAccessKey) {
      console.error("Missing Wasabi credentials");
      return new Response(
        JSON.stringify({ error: "S3 credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === STEP 1: Upload thumbnail to Wasabi S3 ===
    console.log("=== STEP 1: Uploading thumbnail to S3 ===");
    
    const thumbnailId = crypto.randomUUID();
    const s3Key = `${S3_PATHS.THUMBNAILS}/${thumbnailId}.jpg`;

    const aws = new AwsClient({
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
      region: s3Config.region,
      service: "s3",
    });

    // Convert base64 to binary
    const imageData = Uint8Array.from(atob(thumbnailImageBase64), c => c.charCodeAt(0));
    const uploadUrl = `${s3Config.endpoint}/${s3Config.bucketName}/${s3Key}`;

    console.log("Uploading to S3:", uploadUrl);

    const uploadResponse = await aws.fetch(uploadUrl, {
      method: "PUT",
      body: imageData,
      headers: {
        "Content-Type": mimeType,
        "Content-Length": imageData.length.toString(),
      },
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("S3 upload failed:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to upload thumbnail to S3", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const thumbnailCdnUrl = getCdnUrl(s3Key);
    console.log("S3 upload successful, CDN URL:", thumbnailCdnUrl);

    // === STEP 2: Create Salesforce Content record for thumbnail ===
    console.log("=== STEP 2: Creating Salesforce Content record ===");
    
    const thumbnailName = `${videoTitle} (thumbnail)`;
    
    const formData = new FormData();
    formData.append("retURL", "https://worldmotoclash.com");
    formData.append("sObj", "ri1__Content__c");
    formData.append("string_Name", thumbnailName);
    formData.append("string_ri1__Content_Type__c", "JPG");
    formData.append("string_ri1__URL__c", thumbnailCdnUrl);

    console.log("Sending to w2x-engine:", W2X_ENGINE_URL);
    console.log("FormData: Name=" + thumbnailName + ", Content_Type=JPG, URL=" + thumbnailCdnUrl);

    const sfCreateResponse = await fetch(W2X_ENGINE_URL, {
      method: "POST",
      body: formData,
    });

    const sfCreateResponseText = await sfCreateResponse.text();
    console.log("w2x-engine response status:", sfCreateResponse.status);
    console.log("w2x-engine response body:", sfCreateResponseText.substring(0, 500));

    if (!sfCreateResponse.ok) {
      console.error("Failed to create Salesforce record");
      return new Response(
        JSON.stringify({ 
          error: "Failed to create Salesforce thumbnail record", 
          details: sfCreateResponseText.substring(0, 500) 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === STEP 3: Query for the new thumbnail's Salesforce ID ===
    console.log("=== STEP 3: Querying for new thumbnail's Salesforce ID ===");
    
    const thumbnailSalesforceId = await findSalesforceIdByUrl(thumbnailCdnUrl, 5);
    
    if (!thumbnailSalesforceId) {
      console.error("Could not find the newly created thumbnail in Salesforce");
      return new Response(
        JSON.stringify({ 
          error: "Thumbnail record created but ID not found",
          thumbnailCdnUrl,
          note: "The thumbnail was uploaded but we couldn't retrieve its Salesforce ID. You may need to manually link it."
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Found thumbnail Salesforce ID:", thumbnailSalesforceId);

    // === STEP 4: Update original video's thumbnail lookup field ===
    console.log("=== STEP 4: Updating video's thumbnail lookup field ===");
    
    const updateFormData = new FormData();
    updateFormData.append("contentId", videoSalesforceId);
    updateFormData.append("lookup_ri1__Thumbnail__c", thumbnailSalesforceId);

    console.log("Sending update to:", UPDATE_ENGINE_URL);
    console.log("Update: contentId=" + videoSalesforceId + ", lookup_ri1__Thumbnail__c=" + thumbnailSalesforceId);

    const updateResponse = await fetch(UPDATE_ENGINE_URL, {
      method: "POST",
      body: updateFormData,
    });

    const updateResponseText = await updateResponse.text();
    console.log("update-engine response status:", updateResponse.status);
    console.log("update-engine response body:", updateResponseText.substring(0, 500));

    if (!updateResponse.ok) {
      console.warn("Failed to update video's thumbnail field, but thumbnail was created");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Thumbnail created but failed to link to video",
          thumbnailSalesforceId,
          thumbnailCdnUrl,
          videoSalesforceId,
          updateError: updateResponseText.substring(0, 500)
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("=== CREATE VIDEO THUMBNAIL COMPLETE ===");
    console.log("Summary:", {
      videoSalesforceId,
      thumbnailSalesforceId,
      thumbnailCdnUrl,
      s3Key
    });

    return new Response(
      JSON.stringify({
        success: true,
        videoSalesforceId,
        thumbnailSalesforceId,
        thumbnailCdnUrl,
        s3Key,
        message: `Thumbnail created and linked to video "${videoTitle}"`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error creating video thumbnail:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

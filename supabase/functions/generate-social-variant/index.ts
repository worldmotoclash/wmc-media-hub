import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import { getS3Config, getCdnUrl, S3_PATHS } from '../_shared/s3Config.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WMC_CONTENT_API = "https://api.realintelligence.com/api/wmc-content-master.py";
const W2X_ENGINE_URL = "https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php";
const ORG_ID = "00D5e000000HEcP";

interface SocialVariantRequest {
  model: string;
  sourceUrl: string;
  targetWidth: number;
  targetHeight: number;
  outputFilename: string;
  masterId: string;
  platform: string;
  variantName: string;
  jobId?: string;
  variantId?: string;
  sfMasterId?: string;
  creatorContactId?: string;
  salesforceData?: {
    masterContentId: string;
    platform: string;
    platformVariant: string;
    pixelWidth: number;
    pixelHeight: number;
    systemFlags: string[];
  };
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
      
      // Find all content blocks and check URLs
      const contentBlocks = xmlText.match(/<content>[\s\S]*?<\/content>/g) || [];
      
      for (const block of contentBlocks) {
        if (block.includes(cdnUrl)) {
          const idMatch = block.match(/<id>([^<]+)<\/id>/);
          if (idMatch && idMatch[1]) {
            const salesforceId = idMatch[1].trim();
            console.log(`Found Salesforce ID: ${salesforceId}`);
            return salesforceId;
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

// Create a Salesforce Content record via w2x-engine and return the ID
async function createAndFindSalesforceRecord(
  title: string, 
  cdnUrl: string, 
  contentType: string,
  masterSalesforceId?: string,
  creatorContactId?: string
): Promise<{ success: boolean; salesforceId: string | null; error?: string }> {
  console.log(`Creating Salesforce record for variant: ${title}`);
  
  try {
    const formData = new FormData();
    formData.append("retURL", "https://worldmotoclash.com");
    formData.append("sObj", "ri1__Content__c");
    formData.append("string_Name", title);
    formData.append("string_ri1__Content_Type__c", contentType);
    formData.append("string_ri1__URL__c", cdnUrl);
    
    // Link variant to master content record
    if (masterSalesforceId) {
      formData.append("lookup_ri1__Master_Content__c", masterSalesforceId);
      console.log(`Linking variant to master SFDC record: ${masterSalesforceId}`);
    }
    
    // Link to creator Contact if provided
    if (creatorContactId) {
      formData.append("lookup_ri1__Contact__c", creatorContactId);
      console.log(`Linking variant to creator Contact: ${creatorContactId}`);
    }

    console.log("Sending to w2x-engine:", W2X_ENGINE_URL);
    console.log("FormData: Name=" + title + ", Content_Type=" + contentType + ", URL=" + cdnUrl + ", Master=" + (masterSalesforceId || "none") + ", Contact=" + (creatorContactId || "none"));

    const response = await fetch(W2X_ENGINE_URL, {
      method: "POST",
      body: formData,
    });

    const responseText = await response.text();
    console.log(`w2x-engine response status: ${response.status}`);
    console.log(`w2x-engine response: ${responseText.substring(0, 300)}`);

    if (!response.ok) {
      return { 
        success: false, 
        salesforceId: null, 
        error: `w2x-engine returned ${response.status}` 
      };
    }

    // Query API to find the new record
    const salesforceId = await findSalesforceIdByUrl(cdnUrl, 3);
    
    if (salesforceId) {
      return { success: true, salesforceId };
    } else {
      return { 
        success: false, 
        salesforceId: null, 
        error: "Record created but ID not found in API" 
      };
    }
  } catch (error) {
    console.error("Error creating Salesforce record:", error);
    return { 
      success: false, 
      salesforceId: null, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

async function resizeImageNative(
  imageBuffer: Uint8Array,
  targetWidth: number,
  targetHeight: number
): Promise<Uint8Array> {
  console.log(`Native resize requested: ${targetWidth}x${targetHeight}`);
  
  const image = await Image.decode(imageBuffer);
  const srcWidth = image.width;
  const srcHeight = image.height;
  
  console.log(`Source image dimensions: ${srcWidth}x${srcHeight}`);
  
  const srcAspect = srcWidth / srcHeight;
  const targetAspect = targetWidth / targetHeight;
  
  let cropWidth: number;
  let cropHeight: number;
  let cropX: number;
  let cropY: number;
  
  if (srcAspect > targetAspect) {
    cropHeight = srcHeight;
    cropWidth = Math.round(srcHeight * targetAspect);
    cropX = Math.round((srcWidth - cropWidth) / 2);
    cropY = 0;
  } else {
    cropWidth = srcWidth;
    cropHeight = Math.round(srcWidth / targetAspect);
    cropX = 0;
    cropY = Math.round((srcHeight - cropHeight) / 2);
  }
  
  console.log(`Cropping to: ${cropWidth}x${cropHeight} at (${cropX}, ${cropY})`);
  
  const cropped = image.crop(cropX, cropY, cropWidth, cropHeight);
  
  cropped.resize(targetWidth, targetHeight);
  
  console.log(`Resized to: ${targetWidth}x${targetHeight}`);
  
  const result = await cropped.encodeJPEG(90);
  
  return result;
}

async function resizeWithWavespeed(
  sourceUrl: string,
  targetWidth: number,
  targetHeight: number,
  model: string
): Promise<{ imageUrl: string }> {
  const wavespeedApiKey = Deno.env.get("WAVESPEED_API_KEY");
  
  if (!wavespeedApiKey) {
    throw new Error("WAVESPEED_API_KEY not configured");
  }

  console.log(`Calling Wavespeed API with model: ${model}`);

  const response = await fetch("https://api.wavespeed.ai/v1/images/transform", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${wavespeedApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model === "wavespeed_flux_fill" ? "flux-fill" : "flux-inpaint",
      image_url: sourceUrl,
      width: targetWidth,
      height: targetHeight,
      mode: "outpaint",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Wavespeed API error:", errorText);
    throw new Error(`Wavespeed API error: ${errorText}`);
  }

  const result = await response.json();
  return { imageUrl: result.output_url || result.image_url };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: SocialVariantRequest = await req.json();
    console.log("Processing social variant request:", JSON.stringify({
      model: payload.model,
      masterId: payload.masterId,
      platform: payload.platform,
      variantName: payload.variantName,
      targetDimensions: `${payload.targetWidth}x${payload.targetHeight}`,
      outputFilename: payload.outputFilename,
    }, null, 2));

    const {
      model,
      sourceUrl,
      targetWidth,
      targetHeight,
      outputFilename,
      masterId,
      platform,
      variantName,
      jobId,
      variantId,
      sfMasterId,
      creatorContactId,
      salesforceData,
    } = payload;

    if (!sourceUrl || !targetWidth || !targetHeight || !masterId || !outputFilename) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (targetWidth > 6000 || targetHeight > 6000 || targetWidth < 1 || targetHeight < 1) {
      return new Response(
        JSON.stringify({ error: "Invalid dimensions. Must be between 1 and 6000 pixels." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processedImageBuffer: Uint8Array;
    let processedImageUrl: string | null = null;

    if (model === "native_resize" || !model) {
      console.log("Fetching source image from:", sourceUrl);
      const imageResponse = await fetch(sourceUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch source image: ${imageResponse.status}`);
      }
      const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());
      
      processedImageBuffer = await resizeImageNative(imageBuffer, targetWidth, targetHeight);
    } else if (model.startsWith("wavespeed")) {
      const result = await resizeWithWavespeed(sourceUrl, targetWidth, targetHeight, model);
      
      const processedResponse = await fetch(result.imageUrl);
      if (!processedResponse.ok) {
        throw new Error("Failed to fetch processed image from Wavespeed");
      }
      processedImageBuffer = new Uint8Array(await processedResponse.arrayBuffer());
      processedImageUrl = result.imageUrl;
    } else {
      return new Response(
        JSON.stringify({ error: `Unknown model: ${model}` }),
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

    const aws = new AwsClient({
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
      region: s3Config.region,
      service: "s3",
    });

    const s3Key = `${S3_PATHS.SOCIAL_MEDIA_MASTERS}/${masterId}/${outputFilename}`;
    const uploadUrl = `${s3Config.endpoint}/${s3Config.bucketName}/${s3Key}`;

    console.log("Uploading variant to S3:", uploadUrl);

    const uploadResponse = await aws.fetch(uploadUrl, {
      method: "PUT",
      body: processedImageBuffer,
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": processedImageBuffer.length.toString(),
      },
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("S3 upload failed:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to upload variant to S3", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const variantCdnUrl = getCdnUrl(s3Key);
    console.log("S3 upload successful, CDN URL:", variantCdnUrl);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const variantTitle = `${platform} ${variantName} (${targetWidth}x${targetHeight})`;

    const { data: assetData, error: assetError } = await supabase
      .from("media_assets")
      .insert({
        title: variantTitle,
        file_url: variantCdnUrl,
        thumbnail_url: variantCdnUrl,
        source: "generated",
        status: "ready",
        file_format: "jpg",
        master_id: masterId,
        asset_type: "image_variant",
        platform: platform,
        variant_name: variantName,
        s3_key: s3Key,
        metadata: {
          width: targetWidth,
          height: targetHeight,
          platform,
          variantName,
          masterAssetId: masterId,
          jobId,
          variantId,
          outputFilename,
          model,
          generatedAt: new Date().toISOString(),
          sfdcSyncStatus: 'pending',
          creatorContactId,
        },
      })
      .select()
      .single();

    if (assetError) {
      console.error("Error inserting media asset:", assetError);
    }

    // === SALESFORCE SYNC FOR VARIANT ===
    let salesforceId: string | null = null;
    let sfdcSyncStatus: 'success' | 'failed' = 'failed';
    let sfdcSyncError: string | null = null;

    console.log("=== SALESFORCE SYNC FOR VARIANT ===");
    
    try {
      // Get master Salesforce ID from either sfMasterId or salesforceData
      const masterSfId = sfMasterId || salesforceData?.masterContentId;
      
      // Create Salesforce Content record for the variant with link to master and creator
      const sfdcResult = await createAndFindSalesforceRecord(
        variantTitle,
        variantCdnUrl,
        "JPG",
        masterSfId,
        creatorContactId
      );

      if (sfdcResult.success && sfdcResult.salesforceId) {
        salesforceId = sfdcResult.salesforceId;
        sfdcSyncStatus = 'success';
        console.log(`Variant synced to Salesforce: ${salesforceId}`);

        if (assetData?.id) {
          await supabase
            .from("media_assets")
            .update({ 
              salesforce_id: salesforceId,
              metadata: {
                ...assetData.metadata,
                sfdcSyncStatus: 'success',
                sfdcSyncedAt: new Date().toISOString(),
              }
            })
            .eq("id", assetData.id);
        }
      } else {
        sfdcSyncError = sfdcResult.error || "Unknown sync error";
        console.warn("Variant SFDC sync failed:", sfdcSyncError);

        if (assetData?.id) {
          await supabase
            .from("media_assets")
            .update({
              metadata: {
                ...assetData.metadata,
                sfdcSyncStatus: 'failed',
                sfdcSyncError,
                sfdcSyncAttemptedAt: new Date().toISOString(),
              }
            })
            .eq("id", assetData.id);
        }
      }
    } catch (sfError) {
      sfdcSyncError = sfError instanceof Error ? sfError.message : "Unknown SFDC error";
      console.error("Salesforce sync error:", sfError);

      if (assetData?.id) {
        await supabase
          .from("media_assets")
          .update({
            metadata: {
              ...assetData.metadata,
              sfdcSyncStatus: 'failed',
              sfdcSyncError,
              sfdcSyncAttemptedAt: new Date().toISOString(),
            }
          })
          .eq("id", assetData.id);
      }
    }

    console.log("=== SALESFORCE SYNC END ===");

    console.log("Successfully processed variant:", {
      variantId,
      platform,
      variantName,
      dimensions: `${targetWidth}x${targetHeight}`,
      assetId: assetData?.id,
      s3Key,
      salesforceId,
    });

    return new Response(
      JSON.stringify({
        success: true,
        url: variantCdnUrl,
        s3Key: s3Key,
        assetId: assetData?.id,
        salesforceId,
        sfdcSyncStatus,
        sfdcSyncError: sfdcSyncStatus === 'failed' ? sfdcSyncError : undefined,
        dimensions: { width: targetWidth, height: targetHeight },
        platform,
        variantName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing social variant:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

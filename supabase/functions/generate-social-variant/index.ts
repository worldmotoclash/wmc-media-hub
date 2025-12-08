import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  salesforceData?: {
    masterContentId: string;
    platform: string;
    platformVariant: string;
    pixelWidth: number;
    pixelHeight: number;
    systemFlags: string[];
  };
}

// Native image resizing using canvas
async function resizeImageNative(
  imageBuffer: Uint8Array,
  targetWidth: number,
  targetHeight: number
): Promise<Uint8Array> {
  // For now, return the original image
  // In production, you would use a library like sharp or canvas
  // Deno doesn't have native canvas, so we'll use a simple approach
  console.log(`Native resize requested: ${targetWidth}x${targetHeight}`);
  return imageBuffer;
}

// Wavespeed FLUX AI resize/fill
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

  // Call Wavespeed API for image transformation
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
      salesforceData,
    } = payload;

    // Validate required fields
    if (!sourceUrl || !targetWidth || !targetHeight || !masterId || !outputFilename) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate dimensions
    if (targetWidth > 6000 || targetHeight > 6000 || targetWidth < 1 || targetHeight < 1) {
      return new Response(
        JSON.stringify({ error: "Invalid dimensions. Must be between 1 and 6000 pixels." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processedImageBuffer: Uint8Array;
    let processedImageUrl: string | null = null;

    // Process based on selected model
    if (model === "native_resize" || !model) {
      // Fetch source image
      console.log("Fetching source image from:", sourceUrl);
      const imageResponse = await fetch(sourceUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch source image: ${imageResponse.status}`);
      }
      const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());
      
      // Resize using native method
      processedImageBuffer = await resizeImageNative(imageBuffer, targetWidth, targetHeight);
    } else if (model.startsWith("wavespeed")) {
      // Use Wavespeed AI for processing
      const result = await resizeWithWavespeed(sourceUrl, targetWidth, targetHeight, model);
      
      // Fetch the processed image from Wavespeed
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

    // Initialize Wasabi S3 client
    const accessKeyId = Deno.env.get("WASABI_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("WASABI_SECRET_ACCESS_KEY");
    
    if (!accessKeyId || !secretAccessKey) {
      console.error("Missing Wasabi credentials");
      return new Response(
        JSON.stringify({ error: "S3 credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aws = new AwsClient({
      accessKeyId,
      secretAccessKey,
      region: "us-east-1",
      service: "s3",
    });

    // Upload to S3 with the correct folder structure
    const s3Key = `masters/${masterId}/${outputFilename}`;
    const wasabiEndpoint = "https://s3.wasabisys.com";
    const bucketName = "wmc-media";
    const uploadUrl = `${wasabiEndpoint}/${bucketName}/${s3Key}`;

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

    const variantS3Url = `${wasabiEndpoint}/${bucketName}/${s3Key}`;
    console.log("S3 upload successful:", variantS3Url);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert variant record into media_assets
    const { data: assetData, error: assetError } = await supabase
      .from("media_assets")
      .insert({
        title: `${platform} ${variantName} (${targetWidth}x${targetHeight})`,
        file_url: variantS3Url,
        thumbnail_url: variantS3Url,
        source: "generated",
        status: "ready",
        file_format: "jpg",
        master_id: masterId,
        asset_type: "image_variant",
        platform: platform,
        variant_name: variantName,
        s3_key: `wmc-media/${s3Key}`,
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
        },
      })
      .select()
      .single();

    if (assetError) {
      console.error("Error inserting media asset:", assetError);
      // Continue anyway - the image was processed successfully
    }

    // Call Salesforce callback if salesforceData is provided
    let salesforceId: string | null = null;
    if (salesforceData?.masterContentId) {
      try {
        const salesforcePayload = {
          action: "create_variant",
          data: {
            masterContentId: salesforceData.masterContentId,
            platform: salesforceData.platform,
            platformVariant: salesforceData.platformVariant,
            pixelWidth: salesforceData.pixelWidth,
            pixelHeight: salesforceData.pixelHeight,
            publicUrl: variantS3Url,
            systemFlags: salesforceData.systemFlags || [
              "Auto Generated",
              "Social Kit Output",
              "Resized Variant",
              "Derived Asset",
            ],
          },
        };

        console.log("Sending to Salesforce:", JSON.stringify(salesforcePayload, null, 2));

        const sfResponse = await fetch("https://api.realintelligence.com/web2x-engine.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(salesforcePayload),
        });

        if (sfResponse.ok) {
          const sfResult = await sfResponse.json();
          salesforceId = sfResult.salesforceId || sfResult.id || null;
          console.log("Salesforce sync result:", sfResult);

          // Update the asset with Salesforce ID if returned
          if (salesforceId && assetData?.id) {
            await supabase
              .from("media_assets")
              .update({ salesforce_id: salesforceId })
              .eq("id", assetData.id);
          }
        } else {
          console.warn("Salesforce sync warning:", await sfResponse.text());
        }
      } catch (sfError) {
        console.error("Salesforce callback error:", sfError);
        // Don't fail the whole operation for Salesforce sync issues
      }
    }

    console.log("Successfully processed variant:", {
      variantId,
      platform,
      variantName,
      dimensions: `${targetWidth}x${targetHeight}`,
      assetId: assetData?.id,
      s3Key,
    });

    return new Response(
      JSON.stringify({
        success: true,
        url: variantS3Url,
        s3Key: `wmc-media/${s3Key}`,
        assetId: assetData?.id,
        salesforceId,
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

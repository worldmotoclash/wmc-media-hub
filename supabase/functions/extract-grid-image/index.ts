import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractGridImageRequest {
  sourceUrl: string;
  row: number;
  col: number;
  generationId: string;
  positionId: string;
  template: string;
  title?: string;
  salesforceData?: {
    masterContentId?: string;
    template?: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: ExtractGridImageRequest = await req.json();
    console.log("Extracting grid image:", JSON.stringify({
      generationId: payload.generationId,
      position: `${payload.row},${payload.col}`,
      positionId: payload.positionId,
      template: payload.template,
    }, null, 2));

    const {
      sourceUrl,
      row,
      col,
      generationId,
      positionId,
      template,
      title,
      salesforceData,
    } = payload;

    // Validate required fields
    if (!sourceUrl || row === undefined || col === undefined || !generationId || !positionId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: sourceUrl, row, col, generationId, positionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate grid position (0-2 for 3x3 grid)
    if (row < 0 || row > 2 || col < 0 || col > 2) {
      return new Response(
        JSON.stringify({ error: "Invalid grid position. Row and col must be 0-2." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the source 3x3 grid image
    console.log("Fetching source image from:", sourceUrl);
    const imageResponse = await fetch(sourceUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch source image: ${imageResponse.status}`);
    }
    const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());

    // Decode the image
    const image = await Image.decode(imageBuffer);
    const srcWidth = image.width;
    const srcHeight = image.height;
    console.log(`Source grid image dimensions: ${srcWidth}x${srcHeight}`);

    // Calculate crop coordinates for the specific cell
    const cellWidth = Math.floor(srcWidth / 3);
    const cellHeight = Math.floor(srcHeight / 3);
    const cropX = col * cellWidth;
    const cropY = row * cellHeight;

    console.log(`Cropping cell (${row},${col}): ${cellWidth}x${cellHeight} at (${cropX}, ${cropY})`);

    // Crop the specific cell
    const cropped = image.crop(cropX, cropY, cellWidth, cellHeight);

    // Encode as JPEG with 90% quality
    const processedImageBuffer = await cropped.encodeJPEG(90);
    console.log(`Cropped image size: ${processedImageBuffer.length} bytes`);

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
      region: "us-central-1",
      service: "s3",
    });

    // Upload to S3 under generation outputs folder
    const bucketName = "shortf-media";
    const outputFilename = `${positionId}.jpg`;
    const s3Key = `GENERATION_OUTPUTS/variants/${generationId}/${outputFilename}`;
    const wasabiEndpoint = "https://s3.us-central-1.wasabisys.com";
    const uploadUrl = `${wasabiEndpoint}/${bucketName}/${s3Key}`;

    console.log("Uploading extracted image to S3:", uploadUrl);

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
        JSON.stringify({ error: "Failed to upload extracted image to S3", details: errorText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const variantCdnUrl = `https://media.worldmotoclash.com/${s3Key}`;
    console.log("S3 upload successful, CDN URL:", variantCdnUrl);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Position labels for readable titles
    const positionLabels: Record<string, string> = {
      'top-left': 'Top Left (1,1)',
      'top-center': 'Top Center (1,2)',
      'top-right': 'Top Right (1,3)',
      'middle-left': 'Middle Left (2,1)',
      'middle-center': 'Middle Center (2,2)',
      'middle-right': 'Middle Right (2,3)',
      'bottom-left': 'Bottom Left (3,1)',
      'bottom-center': 'Bottom Center (3,2)',
      'bottom-right': 'Bottom Right (3,3)',
    };

    // Insert variant record into media_assets
    const { data: assetData, error: assetError } = await supabase
      .from("media_assets")
      .insert({
        title: title || `Grid Extract - ${positionLabels[positionId] || positionId}`,
        file_url: variantCdnUrl,
        thumbnail_url: variantCdnUrl,
        source: "generated",
        status: "ready",
        file_format: "jpg",
        master_id: generationId,
        asset_type: "grid_variant",
        variant_name: positionId,
        s3_key: s3Key,
        resolution: `${cellWidth}x${cellHeight}`,
        metadata: {
          width: cellWidth,
          height: cellHeight,
          position: positionId,
          row,
          col,
          template,
          sourceGenerationId: generationId,
          extractedAt: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (assetError) {
      console.error("Error inserting media asset:", assetError);
      // Continue anyway - the image was extracted successfully
    } else {
      console.log("Media asset created:", assetData?.id);
    }

    // Call Salesforce callback if salesforceData is provided
    let salesforceId: string | null = null;
    if (salesforceData?.masterContentId) {
      try {
        const salesforcePayload = {
          action: "create_variant",
          data: {
            masterContentId: salesforceData.masterContentId,
            platform: "Grid Extract",
            platformVariant: positionLabels[positionId] || positionId,
            pixelWidth: cellWidth,
            pixelHeight: cellHeight,
            publicUrl: variantCdnUrl,
            systemFlags: [
              "Auto Generated",
              "Grid Extract",
              `Template: ${template}`,
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

    console.log("Successfully extracted grid image:", {
      positionId,
      position: `${row},${col}`,
      dimensions: `${cellWidth}x${cellHeight}`,
      assetId: assetData?.id,
      s3Key,
    });

    return new Response(
      JSON.stringify({
        success: true,
        url: variantCdnUrl,
        s3Key,
        assetId: assetData?.id,
        salesforceId,
        dimensions: { width: cellWidth, height: cellHeight },
        position: positionId,
        row,
        col,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error extracting grid image:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

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

interface ExtractGridImageRequest {
  sourceUrl: string;
  row: number;
  col: number;
  generationId: string;
  positionId: string;
  template: string;
  title?: string;
  masterAssetId?: string;
  masterSalesforceId?: string;
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
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      const apiUrl = `${WMC_CONTENT_API}?orgId=${ORG_ID}&sandbox=False`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        console.error(`API request failed: ${response.status}`);
        continue;
      }
      
      const xmlText = await response.text();
      const escapedUrl = escapeRegExp(cdnUrl);
      
      const patterns = [
        new RegExp(`<content>.*?<id>([^<]+)</id>.*?<url><!\\[CDATA\\[${escapedUrl}\\]\\]></url>.*?</content>`, 's'),
        new RegExp(`<content>.*?<id>([^<]+)</id>.*?<url>${escapedUrl}</url>.*?</content>`, 's'),
        new RegExp(`<content>.*?<url><!\\[CDATA\\[${escapedUrl}\\]\\]></url>.*?<id>([^<]+)</id>.*?</content>`, 's'),
        new RegExp(`<content>.*?<url>${escapedUrl}</url>.*?<id>([^<]+)</id>.*?</content>`, 's'),
      ];
      
      for (const pattern of patterns) {
        const match = xmlText.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
      
      const contentBlocks = xmlText.match(/<content>[\s\S]*?<\/content>/g) || [];
      for (const block of contentBlocks) {
        if (block.includes(cdnUrl)) {
          const idMatch = block.match(/<id>([^<]+)<\/id>/);
          if (idMatch && idMatch[1]) {
            return idMatch[1].trim();
          }
        }
      }
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
    const payload: ExtractGridImageRequest = await req.json();
    console.log("Extracting grid image:", JSON.stringify({
      generationId: payload.generationId,
      position: `${payload.row},${payload.col}`,
      positionId: payload.positionId,
      template: payload.template,
      masterAssetId: payload.masterAssetId,
      masterSalesforceId: payload.masterSalesforceId,
    }, null, 2));

    const {
      sourceUrl,
      row,
      col,
      generationId,
      positionId,
      template,
      title,
      masterAssetId,
      masterSalesforceId,
    } = payload;

    if (!sourceUrl || row === undefined || col === undefined || !generationId || !positionId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: sourceUrl, row, col, generationId, positionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (row < 0 || row > 2 || col < 0 || col > 2) {
      return new Response(
        JSON.stringify({ error: "Invalid grid position. Row and col must be 0-2." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching source image from:", sourceUrl);
    const imageResponse = await fetch(sourceUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch source image: ${imageResponse.status}`);
    }
    const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());

    const image = await Image.decode(imageBuffer);
    const srcWidth = image.width;
    const srcHeight = image.height;
    console.log(`Source grid image dimensions: ${srcWidth}x${srcHeight}`);

    const cellWidth = Math.floor(srcWidth / 3);
    const cellHeight = Math.floor(srcHeight / 3);
    const cropX = col * cellWidth;
    const cropY = row * cellHeight;

    console.log(`Cropping cell (${row},${col}): ${cellWidth}x${cellHeight} at (${cropX}, ${cropY})`);

    const cropped = image.crop(cropX, cropY, cellWidth, cellHeight);

    const processedImageBuffer = await cropped.encodeJPEG(90);
    console.log(`Cropped image size: ${processedImageBuffer.length} bytes`);

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

    const outputFilename = `${positionId}.jpg`;
    const s3Key = `${S3_PATHS.GENERATION_OUTPUTS}/variants/${generationId}/${outputFilename}`;
    const uploadUrl = `${s3Config.endpoint}/${s3Config.bucketName}/${s3Key}`;

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

    const variantCdnUrl = getCdnUrl(s3Key);
    console.log("S3 upload successful, CDN URL:", variantCdnUrl);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    const variantTitle = title || `Grid Extract - ${positionLabels[positionId] || positionId}`;

    const { data: assetData, error: assetError } = await supabase
      .from("media_assets")
      .insert({
        title: variantTitle,
        file_url: variantCdnUrl,
        thumbnail_url: variantCdnUrl,
        source: "generated",
        status: "ready",
        file_format: "jpg",
        master_id: masterAssetId || generationId,
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
          masterAssetId,
          masterSalesforceId,
          extractedAt: new Date().toISOString(),
          sfdcSyncStatus: 'pending',
        },
      })
      .select()
      .single();

    if (assetError) {
      console.error("Error inserting media asset:", assetError);
    } else {
      console.log("Media asset created:", assetData?.id);
    }

    // === SALESFORCE SYNC ===
    let salesforceId: string | null = null;

    try {
      const formData = new FormData();
      formData.append("retURL", "https://worldmotoclash.com");
      formData.append("sObj", "ri1__Content__c");
      formData.append("string_Name", variantTitle);
      formData.append("string_ri1__Content_Type__c", "JPG");
      formData.append("string_ri1__URL__c", variantCdnUrl);

      console.log("=== SALESFORCE SYNC START ===");
      console.log("Sending grid variant to w2x-engine:", W2X_ENGINE_URL);

      const sfResponse = await fetch(W2X_ENGINE_URL, {
        method: "POST",
        body: formData,
      });

      const sfResponseText = await sfResponse.text();
      console.log("w2x-engine response status:", sfResponse.status);

      if (sfResponse.ok) {
        console.log("w2x-engine call successful, querying API for Salesforce ID...");
        salesforceId = await findSalesforceIdByUrl(variantCdnUrl, 3);
        
        if (salesforceId && assetData?.id) {
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
          console.log("Updated with Salesforce ID:", salesforceId);
        } else if (assetData?.id) {
          await supabase
            .from("media_assets")
            .update({
              metadata: {
                ...assetData.metadata,
                sfdcSyncStatus: 'failed',
                sfdcSyncError: "Record created but ID not found",
              }
            })
            .eq("id", assetData.id);
        }
      } else {
        console.error("w2x-engine call failed:", sfResponse.status, sfResponseText.substring(0, 200));
      }
      
      console.log("=== SALESFORCE SYNC END ===");
    } catch (sfError) {
      console.error("Salesforce sync error:", sfError);
    }

    console.log("Successfully extracted grid image:", {
      positionId,
      position: `${row},${col}`,
      dimensions: `${cellWidth}x${cellHeight}`,
      assetId: assetData?.id,
      salesforceId,
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

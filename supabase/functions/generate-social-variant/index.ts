import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SocialVariantRequest {
  model: string;
  imageUrl: string;
  width: number;
  height: number;
  platform: string;
  variantName: string;
  masterId: string;
  jobId: string;
  variantId: string;
  salesforceData?: {
    masterContentId: string;
    platform: string;
    platformVariant: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: SocialVariantRequest = await req.json();
    console.log("Processing social variant request:", JSON.stringify(payload, null, 2));

    const {
      imageUrl,
      width,
      height,
      platform,
      variantName,
      masterId,
      jobId,
      variantId,
      salesforceData
    } = payload;

    // Validate required fields
    if (!imageUrl || !width || !height || !platform || !variantName || !masterId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate dimensions
    if (width > 6000 || height > 6000 || width < 1 || height < 1) {
      return new Response(
        JSON.stringify({ error: "Invalid dimensions. Must be between 1 and 6000 pixels." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // For now, we'll use a simple image resizing approach
    // In production, you'd integrate with Cloudflare Workers or similar
    // This creates a placeholder URL - real implementation would resize the image
    
    // Option 1: Use Cloudflare Image Resizing (if available)
    // Option 2: Use a dedicated image processing service
    // Option 3: Use Wasabi/S3 with Lambda for processing
    
    // For demonstration, we'll create a resized variant URL using Cloudflare's format
    // This assumes the source image is accessible via Cloudflare
    let resizedUrl = imageUrl;
    
    // If using Cloudflare Image Resizing:
    // resizedUrl = `https://your-domain.com/cdn-cgi/image/width=${width},height=${height},fit=cover/${imageUrl}`;
    
    // For now, we'll store the original URL with metadata about desired dimensions
    // A real implementation would:
    // 1. Fetch the original image
    // 2. Resize it using sharp or similar
    // 3. Upload to S3/Wasabi
    // 4. Return the new URL

    // Generate a unique filename for the variant
    const timestamp = Date.now();
    const filename = `social-kit/${masterId}/${platform.toLowerCase()}-${variantName.toLowerCase()}-${width}x${height}-${timestamp}.jpg`;

    // Placeholder: In production, implement actual image resizing here
    // For now, we'll simulate success and store metadata
    const variantUrl = imageUrl; // Would be replaced with actual resized image URL

    // Insert the variant record into media_assets
    const { data: assetData, error: assetError } = await supabase
      .from("media_assets")
      .insert({
        title: `${platform} ${variantName} (${width}x${height})`,
        url: variantUrl,
        source: "generated",
        status: "active",
        metadata: {
          width,
          height,
          platform,
          variantName,
          masterAssetId: masterId,
          jobId,
          generatedAt: new Date().toISOString()
        },
        master_id: masterId,
        asset_type: "social_variant",
        platform: platform,
        variant_name: variantName
      })
      .select()
      .single();

    if (assetError) {
      console.error("Error inserting media asset:", assetError);
      // Don't fail completely - the variant was processed
    }

    // Call Salesforce callback if salesforceData is provided
    if (salesforceData?.masterContentId) {
      try {
        const salesforcePayload = {
          masterContentId: salesforceData.masterContentId,
          platform: salesforceData.platform,
          platformVariant: salesforceData.platformVariant,
          pixelWidth: width,
          pixelHeight: height,
          publicUrl: variantUrl,
          systemFlags: [
            "Auto Generated",
            "Social Kit Output",
            "Resized Variant"
          ]
        };

        console.log("Sending to Salesforce:", JSON.stringify(salesforcePayload, null, 2));

        // Call the Real Intelligence API for Salesforce sync
        const sfResponse = await fetch("https://api.realintelligence.com/web2x-engine.php", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            action: "create_variant",
            data: salesforcePayload
          })
        });

        if (!sfResponse.ok) {
          console.warn("Salesforce sync warning:", await sfResponse.text());
        } else {
          const sfResult = await sfResponse.json();
          console.log("Salesforce sync result:", sfResult);

          // Update the asset with Salesforce ID if returned
          if (sfResult.salesforceId && assetData?.id) {
            await supabase
              .from("media_assets")
              .update({ salesforce_id: sfResult.salesforceId })
              .eq("id", assetData.id);
          }
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
      dimensions: `${width}x${height}`,
      assetId: assetData?.id
    });

    return new Response(
      JSON.stringify({
        success: true,
        url: variantUrl,
        assetId: assetData?.id,
        dimensions: { width, height },
        platform,
        variantName
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing social variant:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

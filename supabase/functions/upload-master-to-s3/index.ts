import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UploadMasterRequest {
  imageBase64: string;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  title?: string;
}

serve(async (req) => {
  // Handle CORS preflight
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

    const { imageBase64, filename, mimeType, width, height, title } = payload;

    // Validate required fields
    if (!imageBase64 || !filename || !width || !height) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: imageBase64, filename, width, height" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique master ID
    const masterId = crypto.randomUUID();
    const s3Key = `wmc-media/masters/${masterId}/master.jpg`;

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

    // Decode base64 image
    const imageData = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));

    // Upload to Wasabi S3
    const wasabiEndpoint = "https://s3.wasabisys.com";
    const bucketName = "wmc-media";
    const uploadUrl = `${wasabiEndpoint}/${bucketName}/${s3Key.replace("wmc-media/", "")}`;

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

    // Construct public URL
    const s3Url = `${wasabiEndpoint}/${bucketName}/${s3Key.replace("wmc-media/", "")}`;
    console.log("S3 upload successful:", s3Url);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert master image record into media_assets
    const { data: assetData, error: assetError } = await supabase
      .from("media_assets")
      .insert({
        title: title || filename.replace(/\.[^/.]+$/, ""),
        file_url: s3Url,
        thumbnail_url: s3Url,
        source: "local_upload",
        status: "ready",
        file_format: "jpg",
        asset_type: "master_image",
        s3_key: s3Key,
        metadata: {
          width,
          height,
          originalFilename: filename,
          mimeType,
          masterId,
          uploadedAt: new Date().toISOString(),
          isMasterImage: true,
        },
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

    // Call Salesforce via Real Intelligence API to create Master Content record
    let salesforceId: string | null = null;
    try {
      const sfPayload = {
        action: "create_content",
        data: {
          contentType: "Image",
          isMaster: true,
          name: title || "Master Image",
          url: s3Url,
          pixelWidth: width,
          pixelHeight: height,
          platform: "All Platforms",
          platformVariant: "Master Image",
          contentSystemFlags: ["Master Image", "Original Upload"],
        },
      };

      console.log("Sending to Salesforce:", JSON.stringify(sfPayload, null, 2));

      const sfResponse = await fetch("https://api.realintelligence.com/web2x-engine.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sfPayload),
      });

      if (sfResponse.ok) {
        const sfResult = await sfResponse.json();
        salesforceId = sfResult.salesforceId || sfResult.id || null;
        console.log("Salesforce sync result:", sfResult);

        // Update asset with Salesforce ID
        if (salesforceId) {
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
      // Don't fail the upload for Salesforce sync issues
    }

    return new Response(
      JSON.stringify({
        success: true,
        masterId,
        assetId: assetData.id,
        s3Url,
        s3Key,
        salesforceId,
        dimensions: { width, height },
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UploadRequest {
  imageBase64: string;
  filename: string;
  mimeType: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: UploadRequest = await req.json();
    console.log("Processing generation input upload:", {
      filename: payload.filename,
      mimeType: payload.mimeType,
    });

    const { imageBase64, filename, mimeType } = payload;

    // Validate required fields
    if (!imageBase64 || !filename) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: imageBase64, filename" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique file ID
    const fileId = crypto.randomUUID();
    const extension = filename.split('.').pop()?.toLowerCase() || 'jpg';
    const s3Key = `GENERATION_INPUTS/${fileId}.${extension}`;

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

    // Decode base64 image
    const imageData = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));

    // Upload to Wasabi S3 - shortf-media bucket (Texas/us-central-1)
    const wasabiEndpoint = "https://s3.us-central-1.wasabisys.com";
    const bucketName = "shortf-media";
    const uploadUrl = `${wasabiEndpoint}/${bucketName}/${s3Key}`;

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

    // Construct CDN URL
    const cdnUrl = `https://media.worldmotoclash.com/${s3Key}`;
    console.log("S3 upload successful, CDN URL:", cdnUrl);

    return new Response(
      JSON.stringify({
        success: true,
        fileId,
        cdnUrl,
        s3Key,
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

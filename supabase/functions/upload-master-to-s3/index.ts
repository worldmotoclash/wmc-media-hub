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
    const s3Key = `SOCAIL_MEDIA_IMAGES_KNEWTV/masters/${masterId}/master.jpg`;

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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert master image record into media_assets
    const imageTitle = title || filename.replace(/\.[^/.]+$/, "");
    const { data: assetData, error: assetError } = await supabase
      .from("media_assets")
      .insert({
        title: imageTitle,
        file_url: cdnUrl,
        thumbnail_url: cdnUrl,
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

    // Create Salesforce Master Content record via Real Intelligence API
    let salesforceId: string | null = null;
    try {
      const sfEndpoint = "https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php";
      
      // Build FormData payload for w2x-engine (multipart/form-data)
      const formData = new FormData();
      formData.append("retURL", "https://worldmotoclash.com");
      formData.append("sObj", "ri1__Content__c");
      formData.append("string_Name", imageTitle);
      formData.append("string_ri1__Content_Type__c", "Image");
      formData.append("string_ri1__URL__c", cdnUrl);

      console.log("Sending to Salesforce via w2x-engine:", sfEndpoint);
      console.log("FormData fields: Name=" + imageTitle + ", Content_Type=Image, URL=" + cdnUrl);

      const sfResponse = await fetch(sfEndpoint, {
        method: "POST",
        body: formData,
      });

      const sfText = await sfResponse.text();
      console.log("Salesforce response status:", sfResponse.status);
      console.log("Salesforce response:", sfText);
      
      if (sfResponse.ok && !sfText.includes("ERROR")) {
        // Try to extract Salesforce ID from response (Content ID pattern)
        const idMatch = sfText.match(/a[0-9A-Za-z]{17}/);
        if (idMatch) {
          salesforceId = idMatch[0];
          console.log("Extracted Salesforce ID:", salesforceId);
          
          // Update asset with Salesforce ID
          await supabase
            .from("media_assets")
            .update({ salesforce_id: salesforceId })
            .eq("id", assetData.id);
        }
      } else {
        console.warn("Salesforce sync failed:", sfText);
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
        cdnUrl,
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

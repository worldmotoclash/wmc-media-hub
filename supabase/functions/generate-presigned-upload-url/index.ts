import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";
import { getS3Config, getCdnUrl, S3_PATHS } from '../_shared/s3Config.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filename, mimeType, width, height } = await req.json();

    if (!filename || !mimeType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: filename, mimeType" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const s3Config = getS3Config();

    if (!s3Config.accessKeyId || !s3Config.secretAccessKey) {
      return new Response(
        JSON.stringify({ error: "S3 credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isVideo = mimeType.startsWith('video/');
    const isAudio = mimeType.startsWith('audio/');
    // Defensive: sanitize extension so reserved chars (":", "*", "?", "#") can never
    // appear in the S3 key. The key itself is `master.{ext}` so this is belt-and-suspenders.
    const rawExt = filename.split('.').pop()?.toLowerCase() || '';
    const safeExt = rawExt.replace(/[^a-z0-9]/g, '');
    const fileExtension = safeExt || (isVideo ? 'mp4' : isAudio ? 'mp3' : 'jpg');

    const masterId = crypto.randomUUID();
    const s3BasePath = isVideo ? S3_PATHS.VIDEO_MASTERS : isAudio ? S3_PATHS.AUDIO_MASTERS : S3_PATHS.SOCIAL_MEDIA_MASTERS;
    const s3Key = `${s3BasePath}/${masterId}/master.${fileExtension}`;

    // Generate presigned PUT URL using aws4fetch
    const aws = new AwsClient({
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
      region: s3Config.region,
      service: "s3",
    });

    const uploadUrl = `${s3Config.endpoint}/${s3Config.bucketName}/${s3Key}`;

    // Create a signed request for PUT
    const signedRequest = await aws.sign(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": mimeType,
      },
      // aws4fetch needs the URL with query params for presigning
      aws: { signQuery: true, allHeaders: true },
    });

    const presignedUrl = signedRequest.url;
    const cdnUrl = getCdnUrl(s3Key);

    console.log("Generated presigned URL for:", { filename, s3Key, masterId });

    return new Response(
      JSON.stringify({
        success: true,
        presignedUrl,
        s3Key,
        masterId,
        cdnUrl,
        uploadHeaders: {
          "Content-Type": mimeType,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

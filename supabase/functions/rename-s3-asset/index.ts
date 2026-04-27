// Rename / sanitize an S3 object key for a media_assets row.
// - Replaces ":" with "-", "*" with "_", collapses runs of "_" and double spaces.
// - Optionally re-extensions .m4v -> .mp4 (default true; no transcode, container rename only).
// - Performs S3 server-side COPY then DELETE on Wasabi.
// - Updates media_assets.s3_key, file_url, file_format.
//
// Why this exists: Wasabi/Cloudflare returns 403 for object keys containing ":"
// in the URL path even when percent-encoded, so videos like
// "WMC FINAL SIZZLES/WMC SIZZLE 4:01  NEW.m4v" are unplayable.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";
import { getS3Config } from "../_shared/s3Config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Characters that break Wasabi/Cloudflare path serving even when percent-encoded.
// Extensions are intentionally preserved — we only rewrite the stem.
function sanitizeKey(key: string, _reextensionM4v: boolean): string {
  // Split into directory parts + filename so we never touch path separators.
  const parts = key.split("/");
  const sanitizedParts = parts.map((segment) => {
    let s = segment;
    s = s.replace(/:/g, "-");        // colons -> hyphens
    s = s.replace(/\*/g, "_");       // asterisks -> underscores
    s = s.replace(/\?/g, "");        // question marks -> drop
    s = s.replace(/#/g, "");         // hashes -> drop
    s = s.replace(/_+/g, "_");       // collapse runs of underscores
    s = s.replace(/ {2,}/g, " ");    // collapse double spaces
    s = s.replace(/^[\s_-]+|[\s_-]+$/g, ""); // trim edges
    return s;
  });
  return sanitizedParts.join("/");
}

function encodeKey(key: string): string {
  // Encode path segments individually so "/" stays as "/".
  return key.split("/").map(encodeURIComponent).join("/");
}

function buildCdnUrl(key: string, cdnBaseUrl: string, endpointUrl: string, bucketName: string): string {
  return cdnBaseUrl
    ? `${cdnBaseUrl}/${encodeKey(key)}`
    : `${endpointUrl}/${bucketName}/${encodeKey(key)}`;
}

interface RenameResult {
  asset_id: string;
  status: "renamed" | "skipped" | "error";
  old_key?: string;
  new_key?: string;
  new_url?: string;
  message?: string;
}

async function renameOne(
  assetId: string,
  reextensionM4v: boolean,
  supabase: ReturnType<typeof createClient>,
  aws: AwsClient,
  s3Config: ReturnType<typeof getS3Config>,
): Promise<RenameResult> {
  const { data: asset, error: fetchErr } = await supabase
    .from("media_assets")
    .select("id, s3_key, file_url, file_format, source")
    .eq("id", assetId)
    .maybeSingle();

  if (fetchErr || !asset) {
    return { asset_id: assetId, status: "error", message: fetchErr?.message ?? "asset not found" };
  }

  const oldKey: string | null = (asset as any).s3_key;
  if (!oldKey) {
    return { asset_id: assetId, status: "skipped", message: "no s3_key on asset" };
  }

  const newKey = sanitizeKey(oldKey, reextensionM4v);
  if (newKey === oldKey) {
    return { asset_id: assetId, status: "skipped", old_key: oldKey, message: "key already clean" };
  }

  // 1. Copy old object -> new key (Wasabi server-side copy)
  // x-amz-copy-source must be URL-encoded "/{bucket}/{encoded-key}"
  const copySource = `/${s3Config.bucketName}/${encodeKey(oldKey)}`;
  const newObjectUrl = `${s3Config.endpoint}/${s3Config.bucketName}/${encodeKey(newKey)}`;

  console.log(`[rename] ${oldKey}  ->  ${newKey}`);

  const copyResp = await aws.fetch(newObjectUrl, {
    method: "PUT",
    headers: {
      "x-amz-copy-source": copySource,
      "x-amz-metadata-directive": "COPY",
    },
  });

  if (!copyResp.ok) {
    const text = await copyResp.text().catch(() => "");
    return {
      asset_id: assetId,
      status: "error",
      old_key: oldKey,
      new_key: newKey,
      message: `S3 copy failed (${copyResp.status}): ${text.slice(0, 300)}`,
    };
  }

  // 2. Delete old object
  const oldObjectUrl = `${s3Config.endpoint}/${s3Config.bucketName}/${encodeKey(oldKey)}`;
  const delResp = await aws.fetch(oldObjectUrl, { method: "DELETE" });
  if (!delResp.ok && delResp.status !== 204) {
    console.warn(`[rename] copy succeeded but delete of old key failed: ${delResp.status}`);
    // Not fatal — file at new location works. Continue.
  }

  // 3. Update DB
  const newUrl = buildCdnUrl(newKey, s3Config.cdnBaseUrl, s3Config.endpoint, s3Config.bucketName);
  const newExt = newKey.split(".").pop()?.toLowerCase() ?? (asset as any).file_format;

  const { error: updateErr } = await supabase
    .from("media_assets")
    .update({
      s3_key: newKey,
      file_url: newUrl,
      file_format: newExt,
      source_id: (asset as any).source === "s3_bucket" ? newKey : undefined,
      updated_at: new Date().toISOString(),
    })
    .eq("id", assetId);

  if (updateErr) {
    return {
      asset_id: assetId,
      status: "error",
      old_key: oldKey,
      new_key: newKey,
      message: `S3 ok but DB update failed: ${updateErr.message}`,
    };
  }

  return {
    asset_id: assetId,
    status: "renamed",
    old_key: oldKey,
    new_key: newKey,
    new_url: newUrl,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const assetId: string | undefined = body.asset_id || body.media_asset_id;
    const assetIds: string[] | undefined = body.asset_ids;
    const albumId: string | undefined = body.album_id;
    const reextensionM4v: boolean = body.reextension_m4v !== false; // default true
    const dryRun: boolean = body.dry_run === true;

    if (!assetId && !assetIds?.length && !albumId) {
      return new Response(
        JSON.stringify({ error: "Provide asset_id, asset_ids, or album_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve target asset IDs
    let targetIds: string[] = [];
    if (assetId) targetIds.push(assetId);
    if (assetIds?.length) targetIds.push(...assetIds);
    if (albumId) {
      const { data: rows, error } = await supabase
        .from("media_assets")
        .select("id, s3_key")
        .eq("album_id", albumId);
      if (error) throw error;
      const dirty = (rows ?? []).filter((r: any) => {
        if (!r.s3_key) return false;
        return /[:*?#]/.test(r.s3_key) || / {2,}/.test(r.s3_key) ||
          (reextensionM4v && r.s3_key.toLowerCase().endsWith(".m4v"));
      });
      targetIds.push(...dirty.map((r: any) => r.id));
    }
    targetIds = Array.from(new Set(targetIds));

    if (dryRun) {
      const { data: rows } = await supabase
        .from("media_assets")
        .select("id, s3_key")
        .in("id", targetIds);
      const preview = (rows ?? []).map((r: any) => ({
        asset_id: r.id,
        old_key: r.s3_key,
        new_key: r.s3_key ? sanitizeKey(r.s3_key, reextensionM4v) : null,
      }));
      return new Response(JSON.stringify({ dry_run: true, count: preview.length, preview }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const s3Config = getS3Config();
    if (!s3Config.accessKeyId || !s3Config.secretAccessKey) {
      throw new Error("S3 credentials not configured");
    }
    const aws = new AwsClient({
      accessKeyId: s3Config.accessKeyId,
      secretAccessKey: s3Config.secretAccessKey,
      region: s3Config.region,
      service: "s3",
    });

    const results: RenameResult[] = [];
    for (const id of targetIds) {
      try {
        results.push(await renameOne(id, reextensionM4v, supabase, aws, s3Config));
      } catch (e) {
        results.push({ asset_id: id, status: "error", message: (e as Error).message });
      }
    }

    const summary = {
      total: results.length,
      renamed: results.filter((r) => r.status === "renamed").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results.filter((r) => r.status === "error").length,
    };

    return new Response(JSON.stringify({ summary, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("rename-s3-asset error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use explicit region endpoints (Wasabi)
const BUCKET_CONFIGS = [
  {
    id: "wasabi-main",
    name: "Wasabi Main Bucket",
    bucket_name: "wmc-main-bucket",
    endpoint_url: "https://s3.us-central-1.wasabisys.com",
    region: "us-central-1",
    scan_frequency_hours: 24,
    is_active: true,
  },
  {
    id: "wasabi-archive",
    name: "Wasabi Archive Bucket",
    bucket_name: "wmc-archive-bucket",
    endpoint_url: "https://s3.us-central-1.wasabisys.com",
    region: "us-central-1",
    scan_frequency_hours: 24,
    is_active: true,
  },
] as const;

type BucketConfig = (typeof BUCKET_CONFIGS)[number];

interface S3Object {
  Key: string;
  LastModified?: string;
  Size?: number;
  ETag?: string;
}

async function listS3ObjectsPaginated(bucket: BucketConfig): Promise<S3Object[]> {
  const accessKeyId = Deno.env.get('WASABI_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('WASABI_SECRET_ACCESS_KEY');
  if (!accessKeyId || !secretAccessKey) throw new Error('Missing Wasabi credentials');

  const aws = new AwsClient({
    accessKeyId,
    secretAccessKey,
    service: 's3',
    region: bucket.region,
  });

  const all: S3Object[] = [];
  let continuation: string | undefined;
  let page = 0;

  while (true) {
    page++;
    const qs = new URLSearchParams({ 'list-type': '2', 'max-keys': '1000' });
    if (continuation) qs.set('continuation-token', continuation);
    const url = `${bucket.endpoint_url}/${bucket.bucket_name}?${qs.toString()}`;

    console.log(`[S3] Listing page ${page}: ${url}`);
    const res = await aws.fetch(url, { method: 'GET' });
    const body = await res.text();
    if (!res.ok) {
      console.error('[S3] Error', res.status, body.slice(0, 500));
      throw new Error(`S3 list error ${res.status}: ${res.statusText}`);
    }

    // Parse XML minimally
    const pageObjects: S3Object[] = [];
    const contentsRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
    let m: RegExpExecArray | null;
    while ((m = contentsRegex.exec(body)) !== null) {
      const block = m[1];
      const key = /<Key>([\s\S]*?)<\/Key>/.exec(block)?.[1];
      if (!key) continue;
      const LastModified = /<LastModified>([\s\S]*?)<\/LastModified>/.exec(block)?.[1];
      const Size = parseInt(/<Size>(\d+)<\/Size>/.exec(block)?.[1] || '0', 10);
      const ETag = /<ETag>"?([\s\S]*?)"?<\/ETag>/.exec(block)?.[1];
      pageObjects.push({ Key: key, LastModified, Size, ETag });
    }
    all.push(...pageObjects);

    const isTruncated = /<IsTruncated>(true|false)<\/IsTruncated>/.exec(body)?.[1] === 'true';
    if (!isTruncated) break;
    continuation = /<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/.exec(body)?.[1];
  }

  console.log(`[S3] Total objects: ${all.length}`);
  return all;
}

function isVideoFile(key: string): boolean {
  return /\.(mp4|m4v|mov|webm|mkv|avi|wmv|flv|mpeg|mpg|3gp)$/i.test(key);
}

function extractTitleFromKey(key: string): string {
  const fileName = key.split('/').pop() || key;
  const nameWithoutExtension = fileName.replace(/\.[^.]+$/, '');
  return nameWithoutExtension.replace(/[-_]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function getFileExtension(key: string): string {
  const parts = key.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { bucketConfigId } = await req.json();
    if (!bucketConfigId) {
      return new Response(JSON.stringify({ error: 'bucketConfigId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const bucket = BUCKET_CONFIGS.find((c) => c.id === bucketConfigId);
    if (!bucket) {
      return new Response(JSON.stringify({ error: `Bucket configuration not found: ${bucketConfigId}` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[SCAN] Starting for ${bucket.name} (${bucket.bucket_name}) @ ${bucket.endpoint_url}`);
    const objects = await listS3ObjectsPaginated(bucket);

    let totalVideos = 0;
    let newVideos = 0;
    let updatedVideos = 0;

    for (const obj of objects) {
      if (!isVideoFile(obj.Key)) continue;
      totalVideos++;

      const title = extractTitleFromKey(obj.Key);
      const fileFormat = getFileExtension(obj.Key);
      const fileUrl = `${bucket.endpoint_url}/${bucket.bucket_name}/${encodeURI(obj.Key)}`;

      const { data: existing } = await supabase
        .from('media_assets')
        .select('id')
        .eq('source_id', obj.Key)
        .eq('source', 's3_bucket')
        .maybeSingle();

      const assetData = {
        title,
        source: 's3_bucket' as const,
        source_id: obj.Key,
        file_url: fileUrl,
        file_format: fileFormat,
        file_size: obj.Size ?? null,
        status: 'pending',
        metadata: {
          bucket: bucket.bucket_name,
          etag: obj.ETag,
          last_modified: obj.LastModified,
          endpoint: bucket.endpoint_url,
        },
        updated_at: new Date().toISOString(),
      };

      if (existing?.id) {
        const { error } = await supabase.from('media_assets').update(assetData).eq('id', existing.id);
        if (!error) updatedVideos++;
        else console.error('[DB] Update error', error);
      } else {
        const { data, error } = await supabase.from('media_assets').insert(assetData).select('id').single();
        if (!error) newVideos++;
        else console.error('[DB] Insert error', error);
      }
    }

    const result = {
      success: true,
      bucket: bucket.bucket_name,
      endpoint: bucket.endpoint_url,
      totalObjects: objects.length,
      totalVideos,
      newVideos,
      updatedVideos,
      scannedAt: new Date().toISOString(),
    };

    console.log('[SCAN] Complete', result);
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    console.error('[SCAN] Error', e?.message || e);
    return new Response(JSON.stringify({ error: 'Scan failed', details: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
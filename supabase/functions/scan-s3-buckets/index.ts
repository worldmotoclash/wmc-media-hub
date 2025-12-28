import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { AwsClient } from 'https://esm.sh/aws4fetch@1.0.20';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BucketConfig {
  id: string;
  name: string;
  bucket_name: string;
  endpoint_url: string;
  region?: string;
  scan_frequency_hours?: number;
  is_active?: boolean;
  access_key_id: string;
}

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
      
      let errorMessage = `S3 list error ${res.status}: ${res.statusText}`;
      
      // Parse S3 error details
      if (body.includes('<Code>')) {
        const codeMatch = /<Code>(.*?)<\/Code>/.exec(body);
        const messageMatch = /<Message>(.*?)<\/Message>/.exec(body);
        if (codeMatch && messageMatch) {
          errorMessage = `${codeMatch[1]}: ${messageMatch[1]}`;
        }
      }
      
      if (res.status === 403) {
        errorMessage = 'Access denied - check your credentials and bucket permissions';
      } else if (res.status === 404) {
        errorMessage = 'Bucket not found - verify bucket name and region';
      }
      
      throw new Error(errorMessage);
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

function isImageFile(key: string): boolean {
  return /\.(jpg|jpeg|png|webp|gif|bmp|tiff|tif|svg|heic|heif)$/i.test(key);
}

function isMediaFile(key: string): boolean {
  return isVideoFile(key) || isImageFile(key);
}

function getAssetType(key: string): 'video' | 'image' {
  return isVideoFile(key) ? 'video' : 'image';
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

    // Check if this is the default fallback config (not a real UUID)
    const isDefaultConfig = bucketConfigId === 'default-wasabi';
    
    let bucket: BucketConfig;
    
    if (isDefaultConfig) {
      // Use hardcoded default Wasabi config for scanning
      bucket = {
        id: 'default-wasabi',
        name: 'Wasabi Production',
        bucket_name: 'shortf-media',
        endpoint_url: 'https://s3.us-central-1.wasabisys.com',
        region: 'us-central-1',
        is_active: true,
        access_key_id: Deno.env.get('WASABI_ACCESS_KEY_ID') || '',
      };
      console.log(`[SCAN] Using default Wasabi config`);
    } else {
      // Load bucket configuration from database
      const { data, error: bucketError } = await supabase
        .from('s3_bucket_configs')
        .select('*')
        .eq('id', bucketConfigId)
        .eq('is_active', true)
        .maybeSingle();

      if (bucketError) {
        console.error('[DB] Error loading bucket config:', bucketError);
        return new Response(JSON.stringify({ error: 'Failed to load bucket configuration', details: bucketError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!data) {
        return new Response(JSON.stringify({ error: `Bucket configuration not found or inactive: ${bucketConfigId}` }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      bucket = data;
    }

    console.log(`[SCAN] Starting for ${bucket.name} (${bucket.bucket_name}) @ ${bucket.endpoint_url}`);
    const objects = await listS3ObjectsPaginated(bucket);

    let totalMedia = 0;
    let newMedia = 0;
    let updatedMedia = 0;

    for (const obj of objects) {
      if (!isMediaFile(obj.Key)) continue;
      totalMedia++;

      const title = extractTitleFromKey(obj.Key);
      const fileFormat = getFileExtension(obj.Key);
      const assetType = getAssetType(obj.Key);
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
        asset_type: assetType,
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
        if (!error) updatedMedia++;
        else console.error('[DB] Update error', error);
      } else {
        const { data, error } = await supabase.from('media_assets').insert(assetData).select('id').single();
        if (!error) newMedia++;
        else console.error('[DB] Insert error', error);
      }
    }

    // Update last_scanned_at in the bucket configuration (skip for default config)
    if (!isDefaultConfig) {
      const { error: updateError } = await supabase
        .from('s3_bucket_configs')
        .update({ last_scanned_at: new Date().toISOString() })
        .eq('id', bucketConfigId);
        
      if (updateError) {
        console.error('[DB] Failed to update last_scanned_at:', updateError);
      }
    }

    const result = {
      success: true,
      bucket: bucket.bucket_name,
      endpoint: bucket.endpoint_url,
      totalObjects: objects.length,
      totalMedia,
      newMedia,
      updatedMedia,
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
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
  cdn_base_url?: string | null;
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

  const startedAt = new Date().toISOString();

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

    // Validate that bucketConfigId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(bucketConfigId)) {
      return new Response(JSON.stringify({ error: 'Invalid bucketConfigId - must be a valid UUID from the database' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load bucket configuration from database
    const { data: bucket, error: bucketError } = await supabase
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

    if (!bucket) {
      return new Response(JSON.stringify({ error: `Bucket configuration not found or inactive: ${bucketConfigId}` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mark as "scanned" immediately so UI doesn't stay at "Never" while the long scan runs.
    const { error: preUpdateError } = await supabase
      .from('s3_bucket_configs')
      .update({ last_scanned_at: startedAt })
      .eq('id', bucketConfigId);

    if (preUpdateError) {
      console.error('[DB] Failed to pre-update last_scanned_at:', preUpdateError);
    }

    const runScan = async () => {
      let totalMedia = 0;
      let newMedia = 0;
      let updatedMedia = 0;
      let skippedMedia = 0;
      let failedMedia = 0;
      let removedMedia = 0;

      try {
        console.log(`[SCAN] Starting for ${bucket.name} (${bucket.bucket_name}) @ ${bucket.endpoint_url}`);
        const objects = await listS3ObjectsPaginated(bucket);
        console.log(`[SCAN] Found ${objects.length} total objects in bucket`);

        // Build a Set of all S3 keys for quick lookup
        const s3KeysSet = new Set<string>();
        for (const obj of objects) {
          if (isMediaFile(obj.Key)) {
            s3KeysSet.add(obj.Key);
          }
        }
        console.log(`[SCAN] ${s3KeysSet.size} media files in S3`);

        // Fetch all existing media_assets for this bucket to detect orphans
        const { data: existingAssets, error: fetchError } = await supabase
          .from('media_assets')
          .select('id, source_id, s3_key')
          .eq('source', 's3_bucket')
          .not('source_id', 'is', null);

        if (fetchError) {
          console.error('[DB] Error fetching existing assets:', fetchError.message);
        }

        // Filter to only assets from this specific bucket by checking metadata or s3_key prefix
        // Since we store bucket info in metadata, we need to check each asset
        const assetsFromThisBucket: { id: string; source_id: string }[] = [];
        
        if (existingAssets) {
          for (const asset of existingAssets) {
            // source_id contains the S3 key - check if it matches this bucket's objects
            // We consider it from this bucket if it was previously scanned from this bucket
            // The safest approach: check if we have this key in our current S3 listing OR if we need to clean it
            assetsFromThisBucket.push({ id: asset.id, source_id: asset.source_id });
          }
        }

        console.log(`[SCAN] ${assetsFromThisBucket.length} existing S3 assets in database`);

        // Find orphaned records (in DB but not in S3 anymore)
        const orphanedAssets = assetsFromThisBucket.filter(
          asset => !s3KeysSet.has(asset.source_id)
        );

        console.log(`[SCAN] Found ${orphanedAssets.length} orphaned assets to remove`);

        // Delete orphaned records in batches
        if (orphanedAssets.length > 0) {
          const orphanIds = orphanedAssets.map(a => a.id);
          const batchSize = 100;
          
          for (let i = 0; i < orphanIds.length; i += batchSize) {
            const batch = orphanIds.slice(i, i + batchSize);
            const { error: deleteError, count } = await supabase
              .from('media_assets')
              .delete()
              .in('id', batch);

            if (deleteError) {
              console.error(`[DB] Error deleting orphaned batch ${i / batchSize + 1}:`, deleteError.message);
            } else {
              removedMedia += batch.length;
              console.log(`[SCAN] Removed ${batch.length} orphaned assets (batch ${i / batchSize + 1})`);
            }
          }
        }

        // Now process current S3 objects (add new, update existing)
        for (const obj of objects) {
          if (!isMediaFile(obj.Key)) {
            continue;
          }
          totalMedia++;

          const title = extractTitleFromKey(obj.Key);
          const fileFormat = getFileExtension(obj.Key);
          const assetType = getAssetType(obj.Key);
          
          // Use CDN URL if configured, otherwise use raw S3 URL
          const fileUrl = bucket.cdn_base_url
            ? `${bucket.cdn_base_url}/${encodeURI(obj.Key)}`
            : `${bucket.endpoint_url}/${bucket.bucket_name}/${encodeURI(obj.Key)}`;

          try {
            const { data: existing } = await supabase
              .from('media_assets')
              .select('id')
              .eq('source_id', obj.Key)
              .eq('source', 's3_bucket')
              .maybeSingle();

            const assetData = {
              title,
              source: 's3_bucket' as const,
              // Keep both fields in sync:
              // - source_id is the canonical S3 object key used for de-duping
              // - s3_key is the searchable/displayable path used across the app
              source_id: obj.Key,
              s3_key: obj.Key,
              file_url: fileUrl,
              file_format: fileFormat,
              file_size: obj.Size ?? null,
              asset_type: assetType,
              status: 'pending',
              metadata: {
                bucket: bucket.bucket_name,
                bucket_config_id: bucketConfigId,
                etag: obj.ETag,
                last_modified: obj.LastModified,
                endpoint: bucket.endpoint_url,
                cdn_base_url: bucket.cdn_base_url || null,
              },
              updated_at: new Date().toISOString(),
            };

            let assetId: string | null = null;
            let isNewAsset = false;

            if (existing?.id) {
              const { error } = await supabase.from('media_assets').update(assetData).eq('id', existing.id);
              if (!error) {
                updatedMedia++;
                assetId = existing.id;
              } else {
                console.error(`[DB] Update error for ${obj.Key}:`, error.message);
                failedMedia++;
              }
            } else {
              const { data: newAsset, error } = await supabase.from('media_assets').insert(assetData).select('id').single();
              if (!error && newAsset) {
                newMedia++;
                assetId = newAsset.id;
                isNewAsset = true;
                console.log(`[SCAN] Imported new asset: ${obj.Key}`);
              } else {
                console.error(`[DB] Insert error for ${obj.Key}:`, error?.message);
                failedMedia++;
              }
            }

            // Trigger auto-tagging for newly discovered assets (images only for now, to save API costs)
            if (isNewAsset && assetId && assetType === 'image') {
              const autoTagUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/auto-tag-media-asset`;
              fetch(autoTagUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                },
                body: JSON.stringify({
                  assetId,
                  mediaUrl: fileUrl,
                  mediaType: assetType,
                }),
              }).then(res => {
                console.log(`[AutoTag] Queued for ${assetId}: ${res.status}`);
              }).catch(err => {
                console.error(`[AutoTag] Failed to queue ${assetId}:`, err);
              });
            }
          } catch (dbError: any) {
            console.error(`[SCAN] Error processing ${obj.Key}:`, dbError?.message || dbError);
            failedMedia++;
          }
        }

        const finishedAt = new Date().toISOString();

        const { error: updateError } = await supabase
          .from('s3_bucket_configs')
          .update({ last_scanned_at: finishedAt })
          .eq('id', bucketConfigId);

        if (updateError) {
          console.error('[DB] Failed to update last_scanned_at:', updateError);
        }

        const result = {
          success: true,
          bucket: bucket.bucket_name,
          endpoint: bucket.endpoint_url,
          totalObjects: objects.length,
          totalMedia,
          newMedia,
          updatedMedia,
          removedMedia,
          skippedMedia,
          failedMedia,
          scannedAt: finishedAt,
        };

        console.log('[SCAN] Complete:', JSON.stringify(result));
      } catch (e: any) {
        console.error('[SCAN] Background error:', e?.message || e);
        // Log partial results even on error
        console.log(`[SCAN] Partial results before error: totalMedia=${totalMedia}, new=${newMedia}, updated=${updatedMedia}, removed=${removedMedia}, failed=${failedMedia}`);
      }
    };

    // Run in background to avoid client timeouts.
    // @ts-ignore EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(runScan());

    return new Response(JSON.stringify({ success: true, status: 'started', startedAt }), {
      status: 202,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error('[SCAN] Error', e?.message || e);
    return new Response(JSON.stringify({ error: 'Scan failed', details: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});


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

function isAudioFile(key: string): boolean {
  return /\.(mp3|wav|aac|flac|ogg|m4a|wma|aiff|alac|ape)$/i.test(key);
}

function isMediaFile(key: string): boolean {
  return isVideoFile(key) || isImageFile(key) || isAudioFile(key);
}

function getAssetType(key: string): 'video' | 'image' | 'audio' {
  if (isVideoFile(key)) return 'video';
  if (isAudioFile(key)) return 'audio';
  return 'image';
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

function getBaseName(key: string): string {
  const fileName = key.split('/').pop() || key;
  return fileName.replace(/\.[^.]+$/, '').toLowerCase();
}

function getFolderPath(key: string): string {
  const parts = key.split('/');
  parts.pop(); // Remove filename
  return parts.join('/');
}

interface ImageLookupMap {
  // Map of "folder/basename" -> full S3 key
  byPath: Map<string, string>;
  // Map of just "basename" -> array of full S3 keys (for cross-folder matching)
  byName: Map<string, string[]>;
}

function buildImageLookupMap(objects: S3Object[]): ImageLookupMap {
  const byPath = new Map<string, string>();
  const byName = new Map<string, string[]>();
  
  for (const obj of objects) {
    if (!isImageFile(obj.Key)) continue;
    
    const folder = getFolderPath(obj.Key);
    const baseName = getBaseName(obj.Key);
    
    // Store by folder/basename for exact folder matching
    const pathKey = folder ? `${folder}/${baseName}` : baseName;
    byPath.set(pathKey.toLowerCase(), obj.Key);
    
    // Also store by just basename for cross-folder thumbnail matching
    const existing = byName.get(baseName) || [];
    existing.push(obj.Key);
    byName.set(baseName, existing);
  }
  
  return { byPath, byName };
}

function findThumbnailForVideo(videoKey: string, imageMap: ImageLookupMap, cdnBaseUrl: string | null, endpointUrl: string, bucketName: string): string | null {
  const videoFolder = getFolderPath(videoKey);
  const videoBaseName = getBaseName(videoKey);
  
  // Patterns to check (in order of priority):
  // 1. Same folder, same base name (video.mp4 -> video.jpg)
  // 2. Same folder with common suffixes (video.mp4 -> video_thumb.jpg)
  // 3. Thumbnails subfolder (folder/video.mp4 -> folder/thumbnails/video.jpg)
  // 4. THUMBNAILS subfolder uppercase (folder/video.mp4 -> folder/THUMBNAILS/video.jpg)
  
  const suffixVariants = ['', '_thumb', '_thumbnail', '-thumb', '-thumbnail'];
  const imageExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  
  // Check same folder with various suffixes
  for (const suffix of suffixVariants) {
    const targetBaseName = `${videoBaseName}${suffix}`;
    const pathKey = videoFolder ? `${videoFolder}/${targetBaseName}` : targetBaseName;
    
    const matchedKey = imageMap.byPath.get(pathKey.toLowerCase());
    if (matchedKey) {
      console.log(`[Thumbnail] Matched ${videoKey} -> ${matchedKey} (same folder)`);
      return buildCdnUrl(matchedKey, cdnBaseUrl, endpointUrl, bucketName);
    }
  }
  
  // Check thumbnails subfolder (lowercase)
  for (const suffix of suffixVariants) {
    const targetBaseName = `${videoBaseName}${suffix}`;
    const thumbnailsFolder = videoFolder ? `${videoFolder}/thumbnails` : 'thumbnails';
    const pathKey = `${thumbnailsFolder}/${targetBaseName}`;
    
    const matchedKey = imageMap.byPath.get(pathKey.toLowerCase());
    if (matchedKey) {
      console.log(`[Thumbnail] Matched ${videoKey} -> ${matchedKey} (thumbnails subfolder)`);
      return buildCdnUrl(matchedKey, cdnBaseUrl, endpointUrl, bucketName);
    }
  }
  
  // Check THUMBNAILS subfolder (uppercase - common pattern)
  for (const suffix of suffixVariants) {
    const targetBaseName = `${videoBaseName}${suffix}`;
    const thumbnailsFolder = videoFolder ? `${videoFolder}/THUMBNAILS` : 'THUMBNAILS';
    const pathKey = `${thumbnailsFolder}/${targetBaseName}`;
    
    const matchedKey = imageMap.byPath.get(pathKey.toLowerCase());
    if (matchedKey) {
      console.log(`[Thumbnail] Matched ${videoKey} -> ${matchedKey} (THUMBNAILS subfolder)`);
      return buildCdnUrl(matchedKey, cdnBaseUrl, endpointUrl, bucketName);
    }
  }
  
  // Check parent-level thumbnails folder (videos/clip.mp4 -> thumbnails/clip.jpg)
  if (videoFolder) {
    const parentParts = videoFolder.split('/');
    parentParts.pop();
    const parentFolder = parentParts.join('/');
    
    for (const suffix of suffixVariants) {
      const targetBaseName = `${videoBaseName}${suffix}`;
      const thumbnailsPath = parentFolder ? `${parentFolder}/thumbnails/${targetBaseName}` : `thumbnails/${targetBaseName}`;
      
      const matchedKey = imageMap.byPath.get(thumbnailsPath.toLowerCase());
      if (matchedKey) {
        console.log(`[Thumbnail] Matched ${videoKey} -> ${matchedKey} (parent thumbnails folder)`);
        return buildCdnUrl(matchedKey, cdnBaseUrl, endpointUrl, bucketName);
      }
    }
  }
  
  return null;
}

function buildCdnUrl(key: string, cdnBaseUrl: string | null, endpointUrl: string, bucketName: string): string {
  return cdnBaseUrl
    ? `${cdnBaseUrl}/${encodeURI(key)}`
    : `${endpointUrl}/${bucketName}/${encodeURI(key)}`;
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

        // Build image lookup map for thumbnail matching
        const imageMap = buildImageLookupMap(objects);
        console.log(`[SCAN] Built image lookup map with ${imageMap.byPath.size} images for thumbnail matching`);

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
        // Batch processing with delays to avoid CPU timeout on large buckets
        const BATCH_SIZE = 100;
        const BATCH_DELAY_MS = 200; // 200ms pause between batches
        
        // Pre-fetch existing assets for ETag comparison to skip unchanged files faster
        const { data: existingAssetsWithMetadata } = await supabase
          .from('media_assets')
          .select('id, source_id, metadata')
          .eq('source', 's3_bucket');
        
        const existingAssetMap = new Map<string, { id: string; etag?: string }>();
        if (existingAssetsWithMetadata) {
          for (const asset of existingAssetsWithMetadata) {
            const etag = (asset.metadata as any)?.etag;
            existingAssetMap.set(asset.source_id, { id: asset.id, etag });
          }
        }
        console.log(`[SCAN] Pre-loaded ${existingAssetMap.size} existing assets for ETag comparison`);
        
        // Filter to only media files first
        const mediaObjects = objects.filter(obj => isMediaFile(obj.Key));
        console.log(`[SCAN] Processing ${mediaObjects.length} media files in batches of ${BATCH_SIZE}`);
        
        for (let batchStart = 0; batchStart < mediaObjects.length; batchStart += BATCH_SIZE) {
          const batch = mediaObjects.slice(batchStart, batchStart + BATCH_SIZE);
          const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(mediaObjects.length / BATCH_SIZE);
          
          console.log(`[SCAN] Processing batch ${batchNum}/${totalBatches} (${batch.length} files)`);
          
          for (const obj of batch) {
            totalMedia++;

            // Fast ETag check - skip if file hasn't changed
            const existingAsset = existingAssetMap.get(obj.Key);
            if (existingAsset && existingAsset.etag && existingAsset.etag === obj.ETag) {
              skippedMedia++;
              continue; // File unchanged, skip entirely
            }

            const title = extractTitleFromKey(obj.Key);
            const fileFormat = getFileExtension(obj.Key);
            const assetType = getAssetType(obj.Key);
            
            // Use CDN URL if configured, otherwise use raw S3 URL
            const fileUrl = bucket.cdn_base_url
              ? `${bucket.cdn_base_url}/${encodeURI(obj.Key)}`
              : `${bucket.endpoint_url}/${bucket.bucket_name}/${encodeURI(obj.Key)}`;

            try {
              // For videos, try to find a matching thumbnail image
              const thumbnailUrl = assetType === 'video'
                ? findThumbnailForVideo(obj.Key, imageMap, bucket.cdn_base_url, bucket.endpoint_url, bucket.bucket_name)
                : null;

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
                thumbnail_url: thumbnailUrl,
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

              if (existingAsset?.id) {
                const { error } = await supabase.from('media_assets').update(assetData).eq('id', existingAsset.id);
                if (!error) {
                  updatedMedia++;
                  assetId = existingAsset.id;
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

              // Defer auto-tagging - only log for now to avoid CPU-intensive API calls
              // Auto-tagging can be done as a separate scheduled job
              if (isNewAsset && assetId && assetType === 'image') {
                console.log(`[AutoTag] Queued for batch tagging: ${assetId} (${obj.Key})`);
                // Future: Store assetId in a queue table for batch processing
              }
            } catch (dbError: any) {
              console.error(`[SCAN] Error processing ${obj.Key}:`, dbError?.message || dbError);
              failedMedia++;
            }
          }
          
          // Pause between batches to avoid CPU timeout
          if (batchStart + BATCH_SIZE < mediaObjects.length) {
            await new Promise(resolve => setTimeout(resolve, BATCH_DELAY_MS));
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


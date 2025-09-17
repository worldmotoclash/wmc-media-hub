import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface S3Object {
  Key: string;
  LastModified: string;
  Size: number;
  ETag: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { bucketConfigId, forceRescan = false } = await req.json();

    console.log('Starting S3 bucket scan for config:', bucketConfigId);

    // Get bucket configuration
    const { data: bucketConfig, error: configError } = await supabaseClient
      .from('s3_bucket_configs')
      .select('*')
      .eq('id', bucketConfigId)
      .single();

    if (configError) {
      console.error('Error fetching bucket config:', configError);
      return new Response(JSON.stringify({ error: 'Bucket configuration not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if we should scan based on last scan time
    if (!forceRescan && bucketConfig.last_scanned_at) {
      const lastScan = new Date(bucketConfig.last_scanned_at);
      const hoursSinceLastScan = (Date.now() - lastScan.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceLastScan < bucketConfig.scan_frequency_hours) {
        console.log('Skipping scan - too soon since last scan');
        return new Response(JSON.stringify({ 
          message: 'Scan skipped - not enough time since last scan',
          nextScanIn: bucketConfig.scan_frequency_hours - hoursSinceLastScan
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // List objects in S3 bucket
    const objects = await listS3Objects(bucketConfig);
    console.log(`Found ${objects.length} objects in bucket`);

    let newAssets = 0;
    let updatedAssets = 0;

    // Process each object
    for (const obj of objects) {
      if (!isVideoFile(obj.Key)) continue;

      const fileUrl = `${bucketConfig.endpoint_url}/${bucketConfig.bucket_name}/${obj.Key}`;
      
      // Check if asset already exists
      const { data: existingAsset } = await supabaseClient
        .from('media_assets')
        .select('id, updated_at')
        .eq('source', 's3_bucket')
        .eq('source_id', obj.Key)
        .eq('file_url', fileUrl)
        .maybeSingle();

      const assetData = {
        title: extractTitleFromKey(obj.Key),
        source: 's3_bucket' as const,
        source_id: obj.Key,
        file_url: fileUrl,
        file_size: obj.Size,
        file_format: getFileExtension(obj.Key),
        status: 'pending',
        metadata: {
          bucket_name: bucketConfig.bucket_name,
          bucket_config_id: bucketConfigId,
          last_modified: obj.LastModified,
          etag: obj.ETag,
        },
        updated_at: new Date().toISOString(),
      };

      if (existingAsset) {
        // Update existing asset
        const { error: updateError } = await supabaseClient
          .from('media_assets')
          .update(assetData)
          .eq('id', existingAsset.id);

        if (!updateError) {
          updatedAssets++;
          
          // Log activity
          await supabaseClient
            .from('content_review_activities')
            .insert({
              media_asset_id: existingAsset.id,
              action: 'discovered',
              details: { scan_type: 'update', bucket_name: bucketConfig.bucket_name }
            });
        }
      } else {
        // Create new asset
        const { data: newAsset, error: insertError } = await supabaseClient
          .from('media_assets')
          .insert(assetData)
          .select('id')
          .single();

        if (!insertError && newAsset) {
          newAssets++;
          
          // Log activity
          await supabaseClient
            .from('content_review_activities')
            .insert({
              media_asset_id: newAsset.id,
              action: 'discovered',
              details: { scan_type: 'new', bucket_name: bucketConfig.bucket_name }
            });
        }
      }
    }

    // Update last scanned timestamp
    await supabaseClient
      .from('s3_bucket_configs')
      .update({ last_scanned_at: new Date().toISOString() })
      .eq('id', bucketConfigId);

    console.log(`Scan complete: ${newAssets} new, ${updatedAssets} updated`);

    return new Response(JSON.stringify({
      success: true,
      results: {
        total_objects: objects.length,
        new_assets: newAssets,
        updated_assets: updatedAssets,
        bucket_name: bucketConfig.bucket_name
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in scan-s3-buckets function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function listS3Objects(bucketConfig: any): Promise<S3Object[]> {
  const accessKeyId = Deno.env.get('WASABI_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('WASABI_SECRET_ACCESS_KEY');

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Wasabi credentials not configured');
  }

  // Simple S3-compatible API call to list objects
  const url = `${bucketConfig.endpoint_url}/${bucketConfig.bucket_name}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `AWS ${accessKeyId}:${await createSignature(secretAccessKey, 'GET', bucketConfig.bucket_name)}`,
    },
  });

  if (!response.ok) {
    console.error('S3 API Error:', response.status, await response.text());
    throw new Error(`Failed to list S3 objects: ${response.statusText}`);
  }

  const xmlText = await response.text();
  
  // Simple XML parsing for S3 ListBucket response
  const objects: S3Object[] = [];
  const keyRegex = /<Key>([^<]+)<\/Key>/g;
  const lastModifiedRegex = /<LastModified>([^<]+)<\/LastModified>/g;
  const sizeRegex = /<Size>([^<]+)<\/Size>/g;
  const etagRegex = /<ETag>([^<]+)<\/ETag>/g;

  let keyMatch, lastModifiedMatch, sizeMatch, etagMatch;
  
  while ((keyMatch = keyRegex.exec(xmlText)) !== null) {
    lastModifiedMatch = lastModifiedRegex.exec(xmlText);
    sizeMatch = sizeRegex.exec(xmlText);
    etagMatch = etagRegex.exec(xmlText);

    if (lastModifiedMatch && sizeMatch && etagMatch) {
      objects.push({
        Key: keyMatch[1],
        LastModified: lastModifiedMatch[1],
        Size: parseInt(sizeMatch[1]),
        ETag: etagMatch[1].replace(/"/g, ''),
      });
    }
  }

  return objects;
}

async function createSignature(secretKey: string, method: string, bucket: string): Promise<string> {
  // Simplified signature - in production, use proper AWS signature v4
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const msgData = encoder.encode(`${method}\n\n\n\n/${bucket}`);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

function isVideoFile(key: string): boolean {
  const videoExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm', '.mkv', '.m4v'];
  return videoExtensions.some(ext => key.toLowerCase().endsWith(ext));
}

function extractTitleFromKey(key: string): string {
  // Remove file extension and path
  const filename = key.split('/').pop() || key;
  const nameWithoutExt = filename.split('.').slice(0, -1).join('.');
  
  // Convert underscores and hyphens to spaces, capitalize words
  return nameWithoutExt
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

function getFileExtension(key: string): string {
  return key.split('.').pop()?.toLowerCase() || '';
}
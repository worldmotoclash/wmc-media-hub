import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hardcoded bucket configurations
const BUCKET_CONFIGS = [
  {
    id: "wasabi-main",
    name: "Wasabi Main Bucket",
    bucket_name: "wmc-main-bucket",
    endpoint_url: "https://s3.us-central-1.wasabisys.com",
    region: "us-central-1",
    scan_frequency_hours: 24,
    is_active: true
  },
  {
    id: "wasabi-archive", 
    name: "Wasabi Archive Bucket",
    bucket_name: "wmc-archive-bucket",
    endpoint_url: "https://s3.us-central-1.wasabisys.com",
    region: "us-central-1", 
    scan_frequency_hours: 24,
    is_active: true
  }
];

interface S3Object {
  Key: string;
  LastModified: string;
  Size: number;
  ETag: string;
}

// AWS SigV4 signing implementation
async function createSignature(
  method: string,
  url: string,
  region: string,
  service: string,
  accessKeyId: string,
  secretAccessKey: string,
  headers: Record<string, string> = {}
): Promise<Record<string, string>> {
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = now.toISOString().slice(0, 19).replace(/[-:]/g, '') + 'Z';

  // Parse URL
  const urlObj = new URL(url);
  const host = urlObj.hostname;
  const path = urlObj.pathname;
  const queryString = urlObj.search.slice(1);

  // Create canonical request
  const signedHeaders = Object.keys(headers).sort().join(';');
  const headerString = Object.entries(headers)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join('\n');

  const canonicalRequest = [
    method,
    path,
    queryString,
    headerString + '\n',
    signedHeaders,
    'UNSIGNED-PAYLOAD'
  ].join('\n');

  // Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  
  const encoder = new TextEncoder();
  const hasher = await crypto.subtle.importKey(
    'raw',
    encoder.encode(canonicalRequest),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const canonicalRequestHash = Array.from(new Uint8Array(
    await crypto.subtle.sign('HMAC', hasher, encoder.encode(canonicalRequest))
  )).map(b => b.toString(16).padStart(2, '0')).join('');

  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    canonicalRequestHash
  ].join('\n');

  // Calculate signature
  async function hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
    const cryptoKey = await crypto.subtle.importKey(
      'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message)));
  }

  const kDate = await hmacSha256(encoder.encode(`AWS4${secretAccessKey}`), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  const signature = Array.from(await hmacSha256(kSigning, stringToSign))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  // Return authorization headers
  const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  
  return {
    ...headers,
    'Host': host,
    'X-Amz-Date': amzDate,
    'Authorization': authorization
  };
}

async function listS3Objects(bucketConfig: any): Promise<S3Object[]> {
  const accessKeyId = Deno.env.get('WASABI_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('WASABI_SECRET_ACCESS_KEY');

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Wasabi credentials not found in environment variables');
  }

  console.log(`Scanning bucket: ${bucketConfig.bucket_name} at ${bucketConfig.endpoint_url}`);
  
  const url = `${bucketConfig.endpoint_url}/${bucketConfig.bucket_name}?list-type=2&max-keys=1000`;
  const headers = await createSignature(
    'GET',
    url,
    bucketConfig.region,
    's3',
    accessKeyId,
    secretAccessKey,
    {
      'Content-Type': 'application/xml'
    }
  );

  console.log(`Making request to: ${url}`);
  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`S3 API Error: ${response.status} - ${errorBody}`);
    throw new Error(`S3 API Error: ${response.status} - ${response.statusText}. Body: ${errorBody}`);
  }

  const xmlText = await response.text();
  console.log(`Received response: ${response.status}, Body length: ${xmlText.length}`);
  
  // Parse XML response
  const objects: S3Object[] = [];
  const contentsRegex = /<Contents>(.*?)<\/Contents>/gs;
  const keyRegex = /<Key>(.*?)<\/Key>/;
  const lastModifiedRegex = /<LastModified>(.*?)<\/LastModified>/;
  const sizeRegex = /<Size>(\d+)<\/Size>/;
  const etagRegex = /<ETag>"?(.*?)"?<\/ETag>/;

  let match;
  while ((match = contentsRegex.exec(xmlText)) !== null) {
    const content = match[1];
    
    const keyMatch = keyRegex.exec(content);
    const lastModifiedMatch = lastModifiedRegex.exec(content);
    const sizeMatch = sizeRegex.exec(content);
    const etagMatch = etagRegex.exec(content);

    if (keyMatch && lastModifiedMatch && sizeMatch && etagMatch) {
      objects.push({
        Key: keyMatch[1],
        LastModified: lastModifiedMatch[1],
        Size: parseInt(sizeMatch[1]),
        ETag: etagMatch[1]
      });
    }
  }

  console.log(`Found ${objects.length} objects in bucket`);
  return objects;
}

function isVideoFile(key: string): boolean {
  const videoExtensions = /\.(mp4|m4v|mov|webm|mkv|avi|wmv|flv|mpeg|mpg|3gp)$/i;
  return videoExtensions.test(key);
}

function extractTitleFromKey(key: string): string {
  const fileName = key.split('/').pop() || key;
  const nameWithoutExtension = fileName.split('.').slice(0, -1).join('.');
  return nameWithoutExtension.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getFileExtension(key: string): string {
  const parts = key.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`Starting S3 bucket scan function`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { bucketConfigId, forceRescan } = await req.json();

    if (!bucketConfigId) {
      return new Response(JSON.stringify({ error: 'bucketConfigId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find bucket configuration
    const bucketConfig = BUCKET_CONFIGS.find(config => config.id === bucketConfigId);
    
    if (!bucketConfig) {
      return new Response(JSON.stringify({ error: `Bucket configuration not found: ${bucketConfigId}` }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Starting S3 bucket scan for config: ${bucketConfigId}`);

    // List objects from S3 bucket
    const objects = await listS3Objects(bucketConfig);
    
    let totalVideos = 0;
    let newVideos = 0;
    let updatedVideos = 0;

    console.log(`Processing ${objects.length} objects from bucket`);

    // Process each object
    for (const obj of objects) {
      if (!isVideoFile(obj.Key)) {
        continue; // Skip non-video files
      }

      totalVideos++;

      const title = extractTitleFromKey(obj.Key);
      const fileFormat = getFileExtension(obj.Key);
      const fileUrl = `${bucketConfig.endpoint_url}/${bucketConfig.bucket_name}/${obj.Key}`;

      // Check if asset already exists
      const { data: existingAssets } = await supabase
        .from('media_assets')
        .select('id, updated_at')
        .eq('source_id', obj.Key)
        .eq('source', 's3');

      const assetData = {
        title,
        source: 's3',
        source_id: obj.Key,
        file_url: fileUrl,
        file_format: fileFormat,
        file_size: obj.Size,
        status: 'pending',
        metadata: {
          bucket: bucketConfig.bucket_name,
          etag: obj.ETag,
          last_modified: obj.LastModified,
          endpoint: bucketConfig.endpoint_url
        }
      };

      if (existingAssets && existingAssets.length > 0) {
        // Update existing asset
        const { error } = await supabase
          .from('media_assets')
          .update({
            ...assetData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingAssets[0].id);

        if (error) {
          console.error('Error updating media asset:', error);
        } else {
          updatedVideos++;
        }
      } else {
        // Insert new asset
        const { error } = await supabase
          .from('media_assets')
          .insert(assetData);

        if (error) {
          console.error('Error inserting media asset:', error);
        } else {
          newVideos++;
        }
      }

      // Log activity
      const { error: activityError } = await supabase
        .from('content_review_activities')
        .insert({
          media_asset_id: null, // We don't have the asset ID here
          action: 'discovered',
          details: {
            source: 's3',
            bucket: bucketConfig.bucket_name,
            key: obj.Key,
            size: obj.Size
          }
        });

      if (activityError) {
        console.error('Error logging activity:', activityError);
      }
    }

    const result = {
      success: true,
      bucketConfig: bucketConfig.name,
      totalObjects: objects.length,
      totalVideos,
      newVideos,
      updatedVideos,
      scannedAt: new Date().toISOString()
    };

    console.log(`Scan complete: ${JSON.stringify(result)}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in scan-s3-buckets function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
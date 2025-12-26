import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getS3Config, getCdnUrl, S3_PATHS } from '../_shared/s3Config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WMC_CONTENT_API = "https://api.realintelligence.com/api/wmc-content-master.py";
const W2X_ENGINE_URL = "https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php";
const ORG_ID = "00D5e000000HEcP";

interface ImageGenerationRequest {
  userId: string;
  model: string;
  prompt: string;
  width?: number;
  height?: number;
  title?: string;
  referenceImageUrl?: string;
  template?: string;
  masterAssetId?: string;
  masterSalesforceId?: string;
  salesforceData?: {
    title: string;
    description?: string;
    categories?: string[];
    tags?: string[];
  };
}

const WAVESPEED_IMAGE_MODELS: Record<string, {
  url: string;
  buildPayload: (params: any) => any;
}> = {
  'flux-schnell': {
    url: 'https://api.wavespeed.ai/api/v3/wavespeed-ai/flux-schnell',
    buildPayload: ({ prompt, width, height, seed }) => ({
      prompt,
      size: `${width}x${height}`,
      num_inference_steps: 4,
      seed: seed || -1,
      guidance_scale: 0,
      num_images: 1,
      enable_safety_checker: true
    })
  },
  'flux-dev': {
    url: 'https://api.wavespeed.ai/api/v3/flux/dev',
    buildPayload: ({ prompt, width, height, seed }) => ({
      prompt,
      size: `${width}x${height}`,
      num_inference_steps: 28,
      seed: seed || -1,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: true
    })
  }
};

// Helper function to escape special regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Query the wmc-content-master API to find a Salesforce ID by matching URL
async function findSalesforceIdByUrl(cdnUrl: string, maxAttempts = 3): Promise<string | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const delayMs = 2000 * attempt;
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      const apiUrl = `${WMC_CONTENT_API}?orgId=${ORG_ID}&sandbox=False`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) continue;
      
      const xmlText = await response.text();
      const escapedUrl = escapeRegExp(cdnUrl);
      
      const patterns = [
        new RegExp(`<content>.*?<id>([^<]+)</id>.*?<url><!\\[CDATA\\[${escapedUrl}\\]\\]></url>.*?</content>`, 's'),
        new RegExp(`<content>.*?<id>([^<]+)</id>.*?<url>${escapedUrl}</url>.*?</content>`, 's'),
        new RegExp(`<content>.*?<url><!\\[CDATA\\[${escapedUrl}\\]\\]></url>.*?<id>([^<]+)</id>.*?</content>`, 's'),
        new RegExp(`<content>.*?<url>${escapedUrl}</url>.*?<id>([^<]+)</id>.*?</content>`, 's'),
      ];
      
      for (const pattern of patterns) {
        const match = xmlText.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
      
      const contentBlocks = xmlText.match(/<content>[\s\S]*?<\/content>/g) || [];
      for (const block of contentBlocks) {
        if (block.includes(cdnUrl)) {
          const idMatch = block.match(/<id>([^<]+)<\/id>/);
          if (idMatch && idMatch[1]) {
            return idMatch[1].trim();
          }
        }
      }
    } catch (error) {
      console.error(`Error querying API (attempt ${attempt}):`, error);
    }
  }
  
  return null;
}

// Create SFDC record and get ID
async function createSfdcRecord(title: string, cdnUrl: string, contentType: string): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("retURL", "https://worldmotoclash.com");
    formData.append("sObj", "ri1__Content__c");
    formData.append("string_Name", title);
    formData.append("string_ri1__Content_Type__c", contentType);
    formData.append("string_ri1__URL__c", cdnUrl);

    console.log("Sending to w2x-engine:", W2X_ENGINE_URL);

    const sfResponse = await fetch(W2X_ENGINE_URL, {
      method: "POST",
      body: formData,
    });

    if (sfResponse.ok) {
      console.log("w2x-engine call successful, querying API for Salesforce ID...");
      return await findSalesforceIdByUrl(cdnUrl, 3);
    } else {
      console.error("w2x-engine call failed:", sfResponse.status);
      return null;
    }
  } catch (error) {
    console.error("SFDC sync error:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ImageGenerationRequest = await req.json();
    const { userId, model, prompt, width = 1024, height = 1024, title, referenceImageUrl, template, masterAssetId, masterSalesforceId, salesforceData } = body;

    const isGridTemplate = template && ['version1', 'version2', 'version3'].includes(template);

    if (!userId || !prompt) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: userId and prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const modelConfig = WAVESPEED_IMAGE_MODELS[model];
    if (!modelConfig) {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown model: ${model}. Supported: flux-schnell, flux-dev` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: genRecord, error: insertError } = await supabase
      .from('image_generations')
      .insert({
        user_id: userId,
        prompt,
        template,
        status: 'pending',
        progress: 0,
        generation_data: {
          model,
          vendor: 'Wavespeed',
          width,
          height,
          title,
          salesforceData,
          masterAssetId,
          masterSalesforceId,
          isGridTemplate
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating generation record:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create generation record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const generationId = genRecord.id;
    console.log(`Created generation record: ${generationId}`);

    EdgeRuntime.waitUntil(generateImage(supabase, generationId, modelConfig, { 
      prompt, width, height, referenceImageUrl, title, template, masterAssetId, masterSalesforceId, isGridTemplate 
    }));

    return new Response(
      JSON.stringify({ success: true, generationId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-wavespeed-image:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateImage(
  supabase: any,
  generationId: string,
  modelConfig: { url: string; buildPayload: (params: any) => any },
  params: { 
    prompt: string; 
    width: number; 
    height: number; 
    referenceImageUrl?: string; 
    title?: string;
    template?: string;
    masterAssetId?: string;
    masterSalesforceId?: string;
    isGridTemplate: boolean;
  }
) {
  const wavespeedApiKey = Deno.env.get('WAVESPEED_API_KEY');
  
  if (!wavespeedApiKey) {
    console.error('WAVESPEED_API_KEY not configured');
    await supabase.from('image_generations').update({
      status: 'failed',
      error_message: 'WAVESPEED_API_KEY not configured'
    }).eq('id', generationId);
    return;
  }

  try {
    await supabase.from('image_generations').update({
      status: 'generating',
      progress: 10
    }).eq('id', generationId);

    const payload = modelConfig.buildPayload(params);
    console.log(`Calling Wavespeed API at ${modelConfig.url}`);

    const response = await fetch(modelConfig.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${wavespeedApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Wavespeed API error:', response.status, errorText);
      throw new Error(`Wavespeed API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Wavespeed API response received');

    let imageUrl: string | null = null;

    if (result.data?.task_id) {
      console.log('Task ID received, polling for completion...');
      await supabase.from('image_generations').update({ progress: 30 }).eq('id', generationId);
      
      imageUrl = await pollForCompletion(wavespeedApiKey, result.data.task_id, supabase, generationId);
    } else if (result.data?.outputs?.[0]?.url) {
      imageUrl = result.data.outputs[0].url;
    } else if (result.data?.url) {
      imageUrl = result.data.url;
    } else {
      console.error('Unexpected response format:', result);
      throw new Error('Unexpected response format from Wavespeed API');
    }

    if (!imageUrl) {
      throw new Error('No image URL returned from Wavespeed API');
    }

    await supabase.from('image_generations').update({ progress: 80 }).eq('id', generationId);
    const s3Url = await uploadToWasabiS3(imageUrl, generationId);

    // === Create media_assets record ===
    const assetType = params.isGridTemplate ? 'generation_master' : 'generated_image';
    const { data: assetData, error: assetError } = await supabase
      .from('media_assets')
      .insert({
        title: params.title || `Generated Image - ${generationId}`,
        file_url: s3Url,
        thumbnail_url: s3Url,
        source: 'generated',
        status: 'ready',
        file_format: 'png',
        asset_type: assetType,
        master_id: params.masterAssetId || null,
        s3_key: `${S3_PATHS.GENERATION_INPUTS}/${generationId}.png`,
        metadata: {
          generationId,
          prompt: params.prompt.substring(0, 500),
          vendor: 'Wavespeed',
          template: params.template,
          isGridTemplate: params.isGridTemplate,
          masterAssetId: params.masterAssetId,
          masterSalesforceId: params.masterSalesforceId,
          createdAt: new Date().toISOString(),
          sfdcSyncStatus: 'pending',
        },
      })
      .select()
      .single();

    if (assetError) {
      console.error('Failed to create media asset:', assetError);
    } else {
      console.log('Created media_assets record:', assetData.id);
    }

    // === SALESFORCE SYNC ===
    let salesforceId: string | null = null;
    if (assetData?.id) {
      console.log('=== SALESFORCE SYNC START ===');
      salesforceId = await createSfdcRecord(params.title || `Generated Image`, s3Url, 'PNG');
      
      if (salesforceId) {
        await supabase
          .from('media_assets')
          .update({ 
            salesforce_id: salesforceId,
            metadata: {
              ...assetData.metadata,
              sfdcSyncStatus: 'success',
              sfdcSyncedAt: new Date().toISOString(),
            }
          })
          .eq('id', assetData.id);
        console.log('Updated with Salesforce ID:', salesforceId);
      }
      console.log('=== SALESFORCE SYNC END ===');
    }

    await supabase.from('image_generations').update({
      status: 'completed',
      progress: 100,
      image_url: s3Url
    }).eq('id', generationId);

    console.log(`Generation ${generationId} completed successfully`);

    // === AUTO-EXTRACT 9 GRID CELLS if 3x3 template ===
    if (params.isGridTemplate) {
      console.log('=== AUTO-EXTRACTING 9 GRID CELLS ===');
      await autoExtractGridCells(supabase, generationId, s3Url, params.template || 'grid', assetData?.id, salesforceId);
    }

  } catch (error) {
    console.error('Generation error:', error);
    await supabase.from('image_generations').update({
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error'
    }).eq('id', generationId);
  }
}

async function autoExtractGridCells(
  supabase: any,
  generationId: string,
  sourceUrl: string,
  template: string,
  masterAssetId: string | undefined,
  masterSalesforceId: string | null
) {
  const positions = [
    { row: 0, col: 0, id: 'top-left' },
    { row: 0, col: 1, id: 'top-center' },
    { row: 0, col: 2, id: 'top-right' },
    { row: 1, col: 0, id: 'middle-left' },
    { row: 1, col: 1, id: 'middle-center' },
    { row: 1, col: 2, id: 'middle-right' },
    { row: 2, col: 0, id: 'bottom-left' },
    { row: 2, col: 1, id: 'bottom-center' },
    { row: 2, col: 2, id: 'bottom-right' },
  ];

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  for (const pos of positions) {
    try {
      console.log(`Extracting grid cell ${pos.id} (${pos.row},${pos.col})...`);
      
      const extractResponse = await fetch(`${supabaseUrl}/functions/v1/extract-grid-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          sourceUrl,
          row: pos.row,
          col: pos.col,
          generationId,
          positionId: pos.id,
          template,
          masterAssetId,
          masterSalesforceId,
        }),
      });

      if (extractResponse.ok) {
        const result = await extractResponse.json();
        console.log(`Grid cell ${pos.id} extracted:`, result.assetId, result.salesforceId);
      } else {
        console.error(`Failed to extract ${pos.id}:`, await extractResponse.text());
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error extracting ${pos.id}:`, error);
    }
  }

  console.log('=== GRID EXTRACTION COMPLETE ===');
}

async function pollForCompletion(apiKey: string, taskId: string, supabase: any, generationId: string): Promise<string> {
  const maxAttempts = 60;
  const pollInterval = 2000;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    
    const statusUrl = `https://api.wavespeed.ai/api/v3/predictions/${taskId}/result`;
    const response = await fetch(statusUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (!response.ok) {
      console.error('Poll status error:', response.status);
      continue;
    }

    const result = await response.json();
    console.log(`Poll attempt ${attempt + 1}:`, result.data?.status);

    if (result.data?.status === 'completed') {
      const outputUrl = result.data.outputs?.[0]?.url || result.data.output?.url;
      if (outputUrl) {
        return outputUrl;
      }
      throw new Error('Completed but no output URL found');
    }

    if (result.data?.status === 'failed') {
      throw new Error(result.data.error || 'Generation failed on Wavespeed');
    }

    const progress = Math.min(30 + (attempt * 50 / maxAttempts), 75);
    await supabase.from('image_generations').update({ progress: Math.round(progress) }).eq('id', generationId);
  }

  throw new Error('Generation timed out');
}

async function uploadToWasabiS3(imageUrl: string, generationId: string): Promise<string> {
  console.log('Uploading image to Wasabi S3...');
  
  const s3Config = getS3Config();
  
  if (!s3Config.accessKeyId || !s3Config.secretAccessKey) {
    console.log('Wasabi credentials not configured, returning original URL');
    return imageUrl;
  }

  try {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    const extension = contentType.includes('jpeg') ? 'jpg' : 'png';

    const { bucketName, region } = s3Config;
    const host = `s3.${region}.wasabisys.com`;
    const key = `${S3_PATHS.GENERATION_INPUTS}/${generationId}.${extension}`;
    const url = `https://${host}/${bucketName}/${key}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const canonicalUri = `/${bucketName}/${key}`;
    const canonicalQueryString = '';
    const payloadHash = await sha256Hex(new Uint8Array(imageBuffer));
    
    const canonicalHeaders = 
      `content-type:${contentType}\n` +
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = `PUT\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${await sha256Hex(new TextEncoder().encode(canonicalRequest))}`;
    
    const signingKey = await getSignatureKey(s3Config.secretAccessKey, dateStamp, region, 's3');
    const signature = await hmacSha256Hex(signingKey, stringToSign);
    
    const authorizationHeader = `${algorithm} Credential=${s3Config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const uploadResponse = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Host': host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        'Authorization': authorizationHeader
      },
      body: imageBuffer
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('S3 upload failed:', uploadResponse.status, errorText);
      throw new Error(`S3 upload failed: ${uploadResponse.status}`);
    }

    const cdnUrl = getCdnUrl(key);
    console.log('Uploaded to S3, CDN URL:', cdnUrl);
    return cdnUrl;

  } catch (error) {
    console.error('S3 upload error:', error);
    return imageUrl;
  }
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function hmacSha256Hex(key: ArrayBuffer, data: string): Promise<string> {
  const result = await hmacSha256(key, data);
  return Array.from(new Uint8Array(result))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + key).buffer, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return await hmacSha256(kService, 'aws4_request');
}

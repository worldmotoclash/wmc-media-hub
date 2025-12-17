import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageGenerationRequest {
  userId: string;
  model: string; // 'flux-schnell' or 'flux-dev'
  prompt: string;
  width?: number;
  height?: number;
  title?: string;
  referenceImageUrl?: string;
  salesforceData?: {
    title: string;
    description?: string;
    categories?: string[];
    tags?: string[];
  };
}

// Wavespeed model configurations
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ImageGenerationRequest = await req.json();
    const { userId, model, prompt, width = 1024, height = 1024, title, referenceImageUrl, salesforceData } = body;

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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create initial record in database
    const { data: genRecord, error: insertError } = await supabase
      .from('image_generations')
      .insert({
        user_id: userId,
        prompt,
        status: 'pending',
        progress: 0,
        generation_data: {
          model,
          vendor: 'Wavespeed',
          width,
          height,
          title,
          salesforceData
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

    // Start background generation
    EdgeRuntime.waitUntil(generateImage(supabase, generationId, modelConfig, { prompt, width, height, referenceImageUrl }));

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
  params: { prompt: string; width: number; height: number; referenceImageUrl?: string }
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
    // Update status to generating
    await supabase.from('image_generations').update({
      status: 'generating',
      progress: 10
    }).eq('id', generationId);

    // Build payload and make request
    const payload = modelConfig.buildPayload(params);
    console.log(`Calling Wavespeed API at ${modelConfig.url}`);
    console.log('Payload:', JSON.stringify(payload));

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
    console.log('Wavespeed API response:', JSON.stringify(result));

    // Handle async generation (if task_id is returned, poll for completion)
    let imageUrl: string | null = null;

    if (result.data?.task_id) {
      // Async polling mode
      console.log('Task ID received, polling for completion...');
      await supabase.from('image_generations').update({ progress: 30 }).eq('id', generationId);
      
      imageUrl = await pollForCompletion(wavespeedApiKey, result.data.task_id, supabase, generationId);
    } else if (result.data?.outputs?.[0]?.url) {
      // Immediate result
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

    // Upload to S3
    await supabase.from('image_generations').update({ progress: 80 }).eq('id', generationId);
    const s3Url = await uploadToWasabiS3(imageUrl, generationId);

    // Update final status
    await supabase.from('image_generations').update({
      status: 'completed',
      progress: 100,
      image_url: s3Url
    }).eq('id', generationId);

    console.log(`Generation ${generationId} completed successfully`);

  } catch (error) {
    console.error('Generation error:', error);
    await supabase.from('image_generations').update({
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error'
    }).eq('id', generationId);
  }
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

    // Update progress
    const progress = Math.min(30 + (attempt * 50 / maxAttempts), 75);
    await supabase.from('image_generations').update({ progress: Math.round(progress) }).eq('id', generationId);
  }

  throw new Error('Generation timed out');
}

async function uploadToWasabiS3(imageUrl: string, generationId: string): Promise<string> {
  console.log('Uploading image to Wasabi S3...');
  
  const accessKeyId = Deno.env.get('WASABI_ACCESS_KEY_ID');
  const secretAccessKey = Deno.env.get('WASABI_SECRET_ACCESS_KEY');
  
  if (!accessKeyId || !secretAccessKey) {
    console.log('Wasabi credentials not configured, returning original URL');
    return imageUrl;
  }

  try {
    // Download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    const extension = contentType.includes('jpeg') ? 'jpg' : 'png';

    // S3 configuration
    const bucket = 'shortf-media';
    const region = 'us-central-1';
    const host = `s3.${region}.wasabisys.com`;
    const key = `GENERATION_INPUTS/${generationId}.${extension}`;
    const url = `https://${host}/${bucket}/${key}`;

    // AWS Signature V4
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const canonicalUri = `/${bucket}/${key}`;
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
    
    const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, 's3');
    const signature = await hmacSha256Hex(signingKey, stringToSign);
    
    const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    // Upload to S3
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

    // Return CDN URL
    const cdnUrl = `https://wmc-media.b-cdn.net/${key}`;
    console.log('Uploaded to S3, CDN URL:', cdnUrl);
    return cdnUrl;

  } catch (error) {
    console.error('S3 upload error:', error);
    // Return original URL as fallback
    return imageUrl;
  }
}

// AWS Signature V4 helper functions
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageGenerationRequest {
  userId: string;
  prompt: string;
  template?: string;
  referenceImageUrl?: string;
  title: string;
  model?: string; // AI model to use for generation
  salesforceData?: {
    title: string;
    description?: string;
    categories?: string[];
    tags?: string[];
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: ImageGenerationRequest = await req.json();
    const { userId, prompt, template, referenceImageUrl, title, model, salesforceData } = requestData;

    // Default to Gemini 2.5 Flash Image if no model specified
    const selectedModel = model || 'google/gemini-2.5-flash-image-preview';

    console.log('Image generation request received:', { userId, prompt: prompt.substring(0, 100), template, title, model: selectedModel });

    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create generation record
    const { data: generation, error: insertError } = await supabase
      .from('image_generations')
      .insert({
        user_id: userId,
        prompt,
        template,
        reference_image_url: referenceImageUrl,
        status: 'pending',
        progress: 0,
        generation_data: { title, model: selectedModel, salesforceData }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating generation record:', insertError);
      throw new Error('Failed to create generation record');
    }

    console.log('Created generation record:', generation.id);

    // Start generation in the background
    const generationPromise = generateImage(
      supabase,
      generation.id,
      prompt,
      template,
      referenceImageUrl,
      selectedModel,
      LOVABLE_API_KEY
    );

    // Use EdgeRuntime.waitUntil to continue processing after response
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(generationPromise);
    } else {
      // Fallback - process without waiting
      generationPromise.catch(console.error);
    }

    return new Response(JSON.stringify({
      success: true,
      generationId: generation.id,
      message: 'Image generation started'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-image function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateImage(
  supabase: any,
  generationId: string,
  prompt: string,
  template: string | undefined,
  referenceImageUrl: string | undefined,
  model: string,
  apiKey: string
) {
  try {
    // Update status to generating
    await supabase
      .from('image_generations')
      .update({ status: 'generating', progress: 10 })
      .eq('id', generationId);

    console.log('Starting image generation with Lovable AI...');

    // Build the prompt with template context if provided
    let fullPrompt = prompt;
    if (template) {
      fullPrompt = `${template}\n\nScene: ${prompt}`;
    }

    // Add motorsport/racing context for better results
    const systemPrompt = `You are generating professional motorsport and racing imagery. 
Create high-quality, cinematic images suitable for marketing and promotional use.
Focus on dynamic action, dramatic lighting, and professional sports photography aesthetics.
The images should capture the excitement and intensity of motorcycle racing.`;

    // Build messages array
    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    // If reference image provided, include it
    if (referenceImageUrl) {
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `Use this reference image as inspiration for style and composition: ${fullPrompt}`
          },
          {
            type: "image_url",
            image_url: { url: referenceImageUrl }
          }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: fullPrompt
      });
    }

    // Update progress
    await supabase
      .from('image_generations')
      .update({ progress: 30 })
      .eq('id', generationId);

    // Call Lovable AI Gateway with image generation model
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages,
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (response.status === 402) {
        throw new Error('Payment required. Please add credits to your workspace.');
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Lovable AI response received');

    // Update progress
    await supabase
      .from('image_generations')
      .update({ progress: 60 })
      .eq('id', generationId);

    // Extract the generated image
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error('No image in response:', JSON.stringify(data).substring(0, 500));
      throw new Error('No image generated from AI response');
    }

    console.log('Image generated successfully, uploading to S3...');

    // Upload to Wasabi S3
    const s3Url = await uploadToWasabiS3(imageUrl, generationId);

    console.log('Image uploaded to S3:', s3Url);

    // Update record with completed status
    await supabase
      .from('image_generations')
      .update({
        status: 'completed',
        progress: 100,
        image_url: s3Url,
        updated_at: new Date().toISOString()
      })
      .eq('id', generationId);

    console.log('Image generation completed successfully');

  } catch (error) {
    console.error('Error during image generation:', error);
    
    await supabase
      .from('image_generations')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date().toISOString()
      })
      .eq('id', generationId);
  }
}

async function uploadToWasabiS3(base64DataUrl: string, generationId: string): Promise<string> {
  const WASABI_ACCESS_KEY_ID = Deno.env.get('WASABI_ACCESS_KEY_ID');
  const WASABI_SECRET_ACCESS_KEY = Deno.env.get('WASABI_SECRET_ACCESS_KEY');
  
  if (!WASABI_ACCESS_KEY_ID || !WASABI_SECRET_ACCESS_KEY) {
    throw new Error('Wasabi S3 credentials not configured');
  }

  // Extract base64 data from data URL
  const base64Match = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!base64Match) {
    throw new Error('Invalid base64 image data');
  }

  const imageFormat = base64Match[1];
  const base64Data = base64Match[2];
  
  // Convert base64 to binary
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // S3 configuration
  const bucket = 'shortf-media';
  const region = 'us-central-1';
  const host = `s3.${region}.wasabisys.com`;
  const s3Key = `GENERATION_OUTPUTS/${generationId}.${imageFormat}`;
  
  const contentType = `image/${imageFormat}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);

  // Create canonical request for AWS Signature Version 4
  const method = 'PUT';
  const canonicalUri = `/${bucket}/${s3Key}`;
  const canonicalQuerystring = '';
  
  // Create payload hash
  const payloadHash = await sha256Hex(bytes);
  
  const canonicalHeaders = 
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  
  const canonicalRequest = 
    `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  
  // Create string to sign
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const canonicalRequestHash = await sha256Hex(new TextEncoder().encode(canonicalRequest));
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;
  
  // Calculate signature
  const signingKey = await getSignatureKey(WASABI_SECRET_ACCESS_KEY, dateStamp, region, 's3');
  const signature = await hmacSha256Hex(signingKey, stringToSign);
  
  // Create authorization header
  const authorizationHeader = 
    `${algorithm} Credential=${WASABI_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  // Upload to S3
  const uploadUrl = `https://${host}${canonicalUri}`;
  
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': authorizationHeader,
    },
    body: bytes,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('S3 upload error:', uploadResponse.status, errorText);
    throw new Error(`Failed to upload to S3: ${uploadResponse.status}`);
  }

  // Return CDN URL
  const cdnUrl = `https://media.worldmotoclash.com/${s3Key}`;
  return cdnUrl;
}

// Helper functions for AWS Signature V4
async function sha256Hex(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return new Uint8Array(signature);
}

async function hmacSha256Hex(key: Uint8Array, message: string): Promise<string> {
  const signature = await hmacSha256(key, message);
  return Array.from(signature)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<Uint8Array> {
  const kDate = await hmacSha256(new TextEncoder().encode(`AWS4${secretKey}`), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
}

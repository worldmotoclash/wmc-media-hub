import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";
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
  prompt: string;
  template?: string;
  referenceImageUrl?: string;
  title: string;
  model?: string;
  masterAssetId?: string;
  masterSalesforceId?: string;
  salesforceData?: {
    title: string;
    description?: string;
    categories?: string[];
    tags?: string[];
  };
}

// Helper function to escape special regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Query the wmc-content-master API to find a Salesforce ID by matching URL
async function findSalesforceIdByUrl(cdnUrl: string, maxAttempts = 3): Promise<string | null> {
  console.log(`Searching for Salesforce ID matching URL: ${cdnUrl}`);
  
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
    const requestData: ImageGenerationRequest = await req.json();
    const { userId, prompt, template, referenceImageUrl, title, model, masterAssetId, masterSalesforceId, salesforceData } = requestData;

    const selectedModel = model || 'google/gemini-2.5-flash-image-preview';
    const isGridTemplate = template && ['version1', 'version2', 'version3'].includes(template);

    console.log('Image generation request received:', { userId, prompt: prompt.substring(0, 100), template, title, model: selectedModel, isGridTemplate });

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

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: generation, error: insertError } = await supabase
      .from('image_generations')
      .insert({
        user_id: userId,
        prompt,
        template,
        reference_image_url: referenceImageUrl,
        status: 'pending',
        progress: 0,
        generation_data: { title, model: selectedModel, salesforceData, masterAssetId, masterSalesforceId, isGridTemplate }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating generation record:', insertError);
      throw new Error('Failed to create generation record');
    }

    console.log('Created generation record:', generation.id);

    const generationPromise = generateImage(
      supabase,
      generation.id,
      prompt,
      template,
      referenceImageUrl,
      selectedModel,
      LOVABLE_API_KEY,
      title,
      masterAssetId,
      masterSalesforceId,
      isGridTemplate
    );

    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(generationPromise);
    } else {
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
  apiKey: string,
  title: string,
  masterAssetId: string | undefined,
  masterSalesforceId: string | undefined,
  isGridTemplate: boolean
) {
  try {
    await supabase
      .from('image_generations')
      .update({ status: 'generating', progress: 10 })
      .eq('id', generationId);

    console.log('Starting image generation with Lovable AI...');

    let fullPrompt = prompt;
    if (template) {
      fullPrompt = `${template}\n\nScene: ${prompt}`;
    }

    const systemPrompt = `You are generating professional motorsport and racing imagery. 
Create high-quality, cinematic images suitable for marketing and promotional use.
Focus on dynamic action, dramatic lighting, and professional sports photography aesthetics.
The images should capture the excitement and intensity of motorcycle racing.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

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

    await supabase
      .from('image_generations')
      .update({ progress: 30 })
      .eq('id', generationId);

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

    await supabase
      .from('image_generations')
      .update({ progress: 60 })
      .eq('id', generationId);

    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error('No image in response:', JSON.stringify(data).substring(0, 500));
      throw new Error('No image generated from AI response');
    }

    console.log('Image generated successfully, uploading to S3...');

    const s3Url = await uploadToWasabiS3(imageUrl, generationId);

    console.log('Image uploaded to S3:', s3Url);

    // === Create media_assets record ===
    const assetType = isGridTemplate ? 'generation_master' : 'generated_image';
    const { data: assetData, error: assetError } = await supabase
      .from('media_assets')
      .insert({
        title: title || `Generated Image - ${generationId}`,
        file_url: s3Url,
        thumbnail_url: s3Url,
        source: 'generated',
        status: 'ready',
        file_format: 'png',
        asset_type: assetType,
        master_id: masterAssetId || null,
        s3_key: `${S3_PATHS.GENERATION_OUTPUTS}/${generationId}.png`,
        metadata: {
          generationId,
          prompt: prompt.substring(0, 500),
          model,
          template,
          isGridTemplate,
          masterAssetId,
          masterSalesforceId,
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

    // === SALESFORCE SYNC for generated image ===
    let salesforceId: string | null = null;
    if (assetData?.id) {
      console.log('=== SALESFORCE SYNC START ===');
      salesforceId = await createSfdcRecord(title || `Generated Image`, s3Url, 'PNG');
      
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

    // === AUTO-EXTRACT 9 GRID CELLS if 3x3 template ===
    if (isGridTemplate) {
      console.log('=== AUTO-EXTRACTING 9 GRID CELLS ===');
      await autoExtractGridCells(supabase, generationId, s3Url, template || 'grid', assetData?.id, salesforceId);
    }

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

      // Small delay between extractions
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error extracting ${pos.id}:`, error);
    }
  }

  console.log('=== GRID EXTRACTION COMPLETE ===');
}

async function uploadToWasabiS3(base64DataUrl: string, generationId: string): Promise<string> {
  const s3Config = getS3Config();
  
  if (!s3Config.accessKeyId || !s3Config.secretAccessKey) {
    throw new Error('Wasabi S3 credentials not configured');
  }

  const base64Match = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!base64Match) {
    throw new Error('Invalid base64 image data');
  }

  const imageFormat = base64Match[1];
  const base64Data = base64Match[2];
  
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const { bucketName, region, endpoint } = s3Config;
  const host = `s3.${region}.wasabisys.com`;
  const s3Key = `${S3_PATHS.GENERATION_OUTPUTS}/${generationId}.${imageFormat}`;
  
  const contentType = `image/${imageFormat}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);

  const method = 'PUT';
  const canonicalUri = `/${bucketName}/${s3Key}`;
  const canonicalQuerystring = '';
  
  const payloadHash = await sha256Hex(bytes);
  
  const canonicalHeaders = 
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  
  const canonicalRequest = 
    `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const canonicalRequestHash = await sha256Hex(new TextEncoder().encode(canonicalRequest));
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;
  
  const signingKey = await getSignatureKey(s3Config.secretAccessKey, dateStamp, region, 's3');
  const signature = await hmacSha256Hex(signingKey, stringToSign);
  
  const authorizationHeader = 
    `${algorithm} Credential=${s3Config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

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

  return getCdnUrl(s3Key);
}

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

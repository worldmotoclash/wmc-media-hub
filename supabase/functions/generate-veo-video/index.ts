import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Interface for the video generation request
interface VeoGenerationRequest {
  userId: string;
  prompt: string;
  negativePrompt?: string;
  duration?: number;
  aspectRatio?: string;
  creativity?: number;
  model?: 'veo-2' | 'veo-3';
  location?: string;
  salesforceData?: Record<string, any>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Video generation request from user:', req.headers.get('authorization')?.split(' ')[1]?.substring(0, 15) || 'unknown');
    
    const requestData: VeoGenerationRequest = await req.json();
    console.log('Prompt:', requestData.prompt + '...');

    if (!requestData.userId) {
      throw new Error('User ID is required');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get Google VEO configuration
    const googleProjectId = Deno.env.get('GOOGLE_VEO_PROJECT_ID');

    if (!googleProjectId || !Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY')) {
      console.error('Missing Google VEO configuration (project or service account)');
      throw new Error('Google VEO credentials not configured');
    }

    const salesforceData = requestData.salesforceData || {};
    const model: 'veo-2' | 'veo-3' = (requestData.model as 'veo-2' | 'veo-3') || 'veo-3';
    const location = requestData.location || Deno.env.get('GOOGLE_VEO_LOCATION') || 'us-central1';
    
    console.log(`🎯 Using model: ${model} in location: ${location}`);
    
    const generationData = {
      prompt: requestData.prompt,
      negativePrompt: requestData.negativePrompt,
      duration: requestData.duration || 5,
      aspectRatio: requestData.aspectRatio || '16:9',
      creativity: requestData.creativity || 0.5,
      model: model,
      location: location,
      salesforceData: salesforceData,
    };

    // Create Supabase record first
    console.log('📝 Creating video generation record in Supabase...');
    
    const { data: videoGeneration, error: insertError } = await supabaseClient
      .from('video_generations')
      .insert({
        user_id: requestData.userId,
        status: 'pending',
        generation_data: generationData,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting video generation:', insertError);
      throw new Error('Failed to create video generation record');
    }

    console.log('✅ Video generation record created:', videoGeneration.id);

    // Mark record as generating while we start the operation in background
    console.log('🎬 Starting video generation...');

    const { error: updateError } = await supabaseClient
      .from('video_generations')
      .update({
        status: 'generating',
        progress: 10,
      })
      .eq('id', videoGeneration.id);

    if (updateError) {
      console.error('Error updating video generation status:', updateError);
    }

    // Prepare data for client-side Salesforce submission
    const salesforceSubmissionData = {
      Name: salesforceData.title || `AI Generated Video - ${new Date().toISOString()}`,
      ri1__Subtitle__c: salesforceData.subtitle || '',
      ri1__Description__c: salesforceData.description || '',
      ri1__URL__c: '', // Will be updated after video generation
      ri1__Length_in_Seconds__c: generationData.duration,
      ri1__Aspect_Ratio__c: generationData.aspectRatio,
      AI_Prompt__c: generationData.prompt,
      AI_Negative_Prompt__c: generationData.negativePrompt,
      AI_Creativity_Level__c: generationData.creativity,
      Generation_Status__c: 'PENDING',
      Generation_Progress__c: 0,
      API_Operation_ID__c: '',
      ri1__Categories__c: salesforceData.categories?.join(';') || '',
      ri1__Template__c: salesforceData.template || '',
      ri1__Location__c: salesforceData.location || '',
      ri1__Track__c: salesforceData.track || '',
      ri1__Scheduled_Date__c: salesforceData.scheduledDate || '',
      ri1__Tags__c: salesforceData.tags?.join(';') || '',
      ri1__Keywords__c: salesforceData.keywords?.join(';') || '',
      ri1__Type__c: 'AI Generated',
      ri1__Status__c: 'Generating'
    };

    // Start real VEO generation process
    EdgeRuntime.waitUntil(startVeoGeneration(videoGeneration.id, generationData, googleProjectId, model, location));

    return new Response(JSON.stringify({
      success: true,
      generationId: videoGeneration.id,
      operationId: null,
      salesforceSubmissionData: salesforceSubmissionData,
      message: 'Video generation started',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-veo-video function:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Real VEO generation process using Google Vertex AI
async function startVeoGeneration(generationId: string, generationData: any, projectId: string, model: 'veo-2' | 'veo-3', location: string) {
  console.log(`🎬 Starting real VEO generation for ${generationId}`);
  
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    // Update progress: Authenticating
    await supabaseClient
      .from('video_generations')
      .update({
        status: 'generating',
        progress: 20,
      })
      .eq('id', generationId);

    // Get service account key for authentication
    const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountKey) {
      throw new Error('Google Service Account Key not found');
    }

    // Parse the service account key
    const credentials = JSON.parse(serviceAccountKey);
    
    console.log('🔐 Generating access token...');
    // Generate access token using service account
    const accessToken = await getAccessToken(credentials);
    
    // Update progress: Preparing request
    await supabaseClient
      .from('video_generations')
      .update({
        progress: 40,
      })
      .eq('id', generationId);
    
    // Build Vertex AI generateVideo payload for VEO
    const targetModel: 'veo-2' | 'veo-3' = model === 'veo-2' ? 'veo-2' : 'veo-3';

    const requestBody = {
      prompt: generationData.prompt,
      negativePrompt: generationData.negativePrompt || undefined,
      durationSeconds: Number(generationData.duration) || 5,
      aspectRatio: generationData.aspectRatio || '16:9',
      creativity: generationData.creativity ?? 0.5,
    } as Record<string, unknown>;

    console.log('🚀 Calling Google Vertex AI VEO generateVideo...');
    console.log('📝 Prompt (truncated):', String(generationData.prompt).slice(0, 120));

    // Update progress: Calling VEO API
    await supabaseClient
      .from('video_generations')
      .update({
        progress: 60,
      })
      .eq('id', generationId);

    const modelPath = `projects/${projectId}/locations/${location}/publishers/google/models/${targetModel}`;
    const startUrl = `https://${location}-aiplatform.googleapis.com/v1/${modelPath}:generateVideo`;
    console.log('🔧 Endpoint:', startUrl);

    const startRes = await fetch(startUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const startContentType = startRes.headers.get('content-type') || '';
    const startData = startContentType.includes('application/json') ? await startRes.json() : { raw: await startRes.text() };
    console.log('📋 Start status:', startRes.status);

    if (!startRes.ok) {
      console.error('❌ VEO start error:', typeof startData === 'string' ? startData : JSON.stringify(startData, null, 2));
      const errMsg = (startData && startData.error && startData.error.message) || (typeof startData === 'string' ? startData.slice(0, 200) : 'Unknown error');
      throw new Error(`VEO API Error (${startRes.status}): ${errMsg}`);
    }

    const operationName: string | undefined = startData?.name;
    if (!operationName) {
      console.error('❌ Missing operation name in response:', JSON.stringify(startData, null, 2));
      throw new Error('VEO API did not return an operation name');
    }

    // Persist real operation ID
    await supabaseClient
      .from('video_generations')
      .update({ google_operation_id: operationName })
      .eq('id', generationId);

    console.log('⏳ Polling operation:', operationName);

    // Extract operation ID from the full operation name
    // VEO returns: projects/{project}/locations/{location}/publishers/google/models/{model}/operations/{id}
    // But we need: projects/{project}/locations/{location}/operations/{id}
    const operationParts = operationName.split('/');
    const operationId = operationParts[operationParts.length - 1];
    console.log('🔎 Extracted operationId:', operationId);
    
    if (!operationId) {
      throw new Error('Could not extract operation ID from: ' + operationName);
    }
    
    const opUrlNormalized = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/operations/${operationId}`;
    const opUrlRaw = `https://${location}-aiplatform.googleapis.com/v1/${operationName}`;
    console.log('📡 Poll URL (normalized):', opUrlNormalized);
    console.log('📡 Poll URL (raw):', opUrlRaw);

    const maxAttempts = 120; // ~10 minutes @ 5s
    let attempt = 0;
    let videoUrl: string | null = null;

    while (attempt < maxAttempts) {
      attempt++;
      await new Promise((r) => setTimeout(r, 5000));

      // Try normalized first
      let opRes = await fetch(opUrlNormalized, {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // Fallback to raw path on 400/404
      if (!opRes.ok && (opRes.status === 400 || opRes.status === 404)) {
        console.warn(`⚠️ Poll ${opRes.status} on normalized path, trying raw path...`);
        opRes = await fetch(opUrlRaw, {
          method: 'GET',
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }

      const opCt = opRes.headers.get('content-type') || '';
      const opData = opCt.includes('application/json') ? await opRes.json() : { raw: await opRes.text() };

      if (!opRes.ok) {
        console.error('❌ Operation polling error:', typeof opData === 'string' ? opData : JSON.stringify(opData, null, 2));
        throw new Error(`VEO operation error (${opRes.status})`);
      }

      const progress = opData?.metadata?.progressPercent;
      if (typeof progress === 'number') {
        await supabaseClient
          .from('video_generations')
          .update({ progress })
          .eq('id', generationId);
      }

      if (opData?.done) {
        if (opData.error) {
          const m = opData.error.message || 'Unknown operation error';
          throw new Error(m);
        }
        // Try to extract a video URL from known fields
        const predictions = opData?.response?.predictions || [];
        const maybeUri =
          opData?.response?.outputUri ||
          opData?.response?.videoUri ||
          (Array.isArray(predictions) && (predictions[0]?.contentUri || predictions[0]?.videoUri || predictions[0]?.mediaUri || predictions[0]?.uri || predictions[0]?.gcsUri));

        if (typeof maybeUri === 'string') {
          videoUrl = maybeUri;
        }
        break;
      }
    }

    console.log('🏁 Polling finished. Video URL found:', Boolean(videoUrl));

    if (!videoUrl) {
      console.warn('⚠️ No video URL discovered in operation response. Saving completion without URL.');
    }


    // Update progress: Processing response
    await supabaseClient
      .from('video_generations')
      .update({
        progress: 80,
      })
      .eq('id', generationId);

    if (videoUrl) {
      await supabaseClient
        .from('video_generations')
        .update({
          status: 'completed',
          progress: 100,
          video_url: videoUrl,
          error_message: null,
        })
        .eq('id', generationId);

      console.log(`✅ VEO generation ${generationId} completed successfully`);
      console.log(`🎥 Video URL: ${String(videoUrl).substring(0, 120)}...`);
    } else {
      // Mark as completed but without a URL so client can take follow-up action
      await supabaseClient
        .from('video_generations')
        .update({
          status: 'completed',
          progress: 100,
          error_message: 'Completed but no video URL returned by VEO operation',
        })
        .eq('id', generationId);
      console.warn('❕ Completed without a video URL. Full operation response was logged earlier.');
    }
    
  } catch (error) {
    console.error(`❌ Error in VEO generation for ${generationId}:`, error);
    console.error('📋 Error details:', error.stack);
    
    // Mark as failed with detailed error message
    await supabaseClient
      .from('video_generations')
      .update({
        status: 'failed',
        progress: 0,
        error_message: `VEO generation failed: ${error.message}`,
      })
      .eq('id', generationId);
  }
}

// Helper function to get Google Cloud access token using service account
async function getAccessToken(credentials: any): Promise<string> {
  const jwt = await createJWT(credentials);
  
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  
  // Safely parse token response
  let tokenData: any = null;
  let tokenRaw: string | null = null;
  try {
    const ct = tokenResponse.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      tokenData = await tokenResponse.json();
    } else {
      tokenRaw = await tokenResponse.text();
    }
  } catch (e) {
    try { tokenRaw = await tokenResponse.text(); } catch {}
  }
  
  if (!tokenResponse.ok) {
    const msg = tokenData?.error_description || tokenData?.error || (tokenRaw ? tokenRaw.slice(0, 200) : 'Unknown token error');
    throw new Error(`Failed to get access token: ${msg}`);
  }
  
  const access = tokenData?.access_token;
  if (!access) {
    throw new Error('Access token missing from token response');
  }
  return access;
}

// Helper function to create JWT for service account authentication
async function createJWT(credentials: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  
  // Encode header and payload
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  
  // Create the signing input
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  
  // Import the private key
  const privateKeyPem = credentials.private_key;
  const privateKeyBuffer = pemToArrayBuffer(privateKeyPem);
  
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBuffer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );
  
  // Sign the JWT
  const encoder = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    encoder.encode(signingInput)
  );
  
  // Encode signature
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  return `${signingInput}.${signature}`;
}

// Helper function to convert PEM to ArrayBuffer
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const pemContents = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return bytes.buffer;
}

// Note: All Salesforce operations are now handled client-side using iframe method
// This ensures proper form submission with sObj=ri1__Content__c and avoids server-side CORS issues
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Style Profile interface for consistency enforcement
interface StyleProfile {
  subjects?: Array<{
    id: string;
    type: string;
    appearance: string;
    wardrobe?: string;
    distinguishingTraits: string[];
    position: string;
  }>;
  environment?: {
    setting: string;
    timeOfDay: string;
    weather?: string;
    backgroundElements: string[];
  };
  lighting?: {
    direction: string;
    quality: string;
    keyTones: string[];
  };
  colorGrade?: {
    palette: string[];
    mood: string;
    contrast: string;
    texture: string;
  };
  visualAnchors?: string[];
  negativeConstraints?: string[];
}

// Interface for the video generation request
interface VeoGenerationRequest {
  userId: string;
  creatorContactId?: string; // Salesforce Contact ID of the creator
  prompt: string;
  negativePrompt?: string;
  duration?: number;
  aspectRatio?: string;
  creativity?: number;
  model?: 'veo-2' | 'veo-3';
  location?: string;
  mediaUrlKey?: string;
  startImage?: string;
  endImage?: string;
  styleProfile?: StyleProfile;
  styleOverride?: string;
  salesforceData?: Record<string, any>;
}

// Allowed durations for VEO text_to_video
const VEO_ALLOWED_DURATIONS = [4, 6, 8] as const;
function normalizeDuration(input?: number): number {
  const n = Number(input);
  return (VEO_ALLOWED_DURATIONS as readonly number[]).includes(n) ? n : 6;
}

// Helper function to prepare image for VEO API
// VEO accepts either gcsUri or bytesBase64Encoded
async function prepareImageForVeo(imageUrl: string): Promise<{ bytesBase64Encoded?: string; gcsUri?: string; mimeType: string }> {
  // If already a GCS URI, use directly
  if (imageUrl.startsWith('gs://')) {
    const mimeType = imageUrl.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    console.log(`📦 Using GCS URI directly: ${imageUrl.substring(0, 50)}...`);
    return { gcsUri: imageUrl, mimeType };
  }
  
  // Otherwise, fetch and convert to base64
  console.log(`📥 Fetching image from URL: ${imageUrl.substring(0, 50)}...`);
  
  try {
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to base64 using a more efficient method for Deno
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);
    
    // Detect mime type from content-type header or URL
    let contentType = response.headers.get('content-type') || '';
    if (!contentType || contentType === 'application/octet-stream') {
      // Fallback to URL extension
      if (imageUrl.toLowerCase().includes('.png')) {
        contentType = 'image/png';
      } else if (imageUrl.toLowerCase().includes('.webp')) {
        contentType = 'image/webp';
      } else {
        contentType = 'image/jpeg';
      }
    }
    
    console.log(`✅ Image prepared: ${(arrayBuffer.byteLength / 1024).toFixed(1)}KB, type: ${contentType}`);
    
    return { bytesBase64Encoded: base64, mimeType: contentType };
  } catch (error) {
    console.error('❌ Error preparing image for VEO:', error);
    throw new Error(`Failed to prepare image for VEO: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
    const location = Deno.env.get('GOOGLE_VEO_LOCATION') || 'us-central1';
    const modelId = Deno.env.get('GOOGLE_VEO_MODEL') || 'veo-3.0-generate-001';
    
    console.log(`🎯 Using modelId: ${modelId} in location: ${location}`);
    console.log(`🎨 Style Lock: ${requestData.styleProfile ? 'Enabled' : 'Disabled'}`);
    
    // Build style-enhanced prompt if style profile is provided
    let enhancedPrompt = requestData.prompt;
    if (requestData.styleProfile) {
      const sp = requestData.styleProfile;
      const subjectsList = sp.subjects?.map(s => 
        `${s.id} (${s.type}): ${s.appearance}${s.wardrobe ? `, wearing ${s.wardrobe}` : ''}`
      ).join('; ') || '';
      
      const anchorsList = sp.visualAnchors?.slice(0, 5).join(', ') || '';
      const envDesc = sp.environment ? `${sp.environment.setting}, ${sp.environment.timeOfDay}` : '';
      const lightDesc = sp.lighting ? `${sp.lighting.direction} ${sp.lighting.quality} lighting` : '';
      
      enhancedPrompt = `[STYLE LOCK - Maintain exact consistency with reference image]
${requestData.prompt}

MANDATORY CONSISTENCY REQUIREMENTS:
- Subjects: ${subjectsList}
- Environment: ${envDesc}
- Lighting: ${lightDesc}
- Visual anchors that MUST remain constant: ${anchorsList}
${requestData.styleOverride ? `\nAdditional constraints: ${requestData.styleOverride}` : ''}
DO NOT introduce new characters, change wardrobe, or alter the environment from the reference.`;
      
      console.log('📝 Enhanced prompt with Style Lock constraints');
    }
    
    const generationData = {
      prompt: enhancedPrompt,
      originalPrompt: requestData.prompt,
      negativePrompt: requestData.negativePrompt,
      duration: normalizeDuration(requestData.duration),
      aspectRatio: requestData.aspectRatio || '16:9',
      creativity: requestData.creativity || 0.5,
      model: modelId,
      location: location,
      salesforceData: salesforceData,
      hasStyleProfile: !!requestData.styleProfile,
      startImage: requestData.startImage,
      endImage: requestData.endImage,
      creatorContactId: requestData.creatorContactId,
    };

    // Create Supabase record first
    console.log('📝 Creating video generation record in Supabase...');
    
    const { data: videoGeneration, error: insertError } = await supabaseClient
      .from('video_generations')
      .insert({
        user_id: requestData.userId,
        status: 'pending',
        generation_data: generationData,
        media_url_key: requestData.mediaUrlKey,
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
      ri1__Generation_Status__c: 'PENDING',
      ri1__Generation_Progress__c: 0,
      API_Operation_ID__c: '',
      ri1__Categories__c: salesforceData.categories?.join(';') || '',
      ri1__Template__c: salesforceData.template || '',
      ri1__Location__c: salesforceData.location || '',
      ri1__Track__c: salesforceData.track || '',
      ri1__Scheduled_Date__c: salesforceData.scheduledDate || '',
      ri1__Tags__c: salesforceData.tags?.join(';') || '',
      ri1__Keywords__c: salesforceData.keywords?.join(';') || '',
      ri1__Type__c: 'AI Generated',
      ri1__Status__c: 'Generating',
      // New fields: Visual Anchors, Extra Constraints, Negative Constraints
      ri1__Visual_Anchors__c: requestData.styleProfile?.visualAnchors?.join(', ') || '',
      ri1__Extra_Constraints__c: requestData.styleOverride || '',
      ri1__Negative_Constraints__c: requestData.styleProfile?.negativeConstraints?.join(', ') || '',
      // Creator Contact ID - link content to the creator
      lookup_ri1__Contact__c: requestData.creatorContactId || '',
    };

    // Start real VEO generation process
    EdgeRuntime.waitUntil(startVeoGeneration(videoGeneration.id, generationData, googleProjectId, modelId, location));

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
async function startVeoGeneration(generationId: string, generationData: any, projectId: string, modelId: string, location: string) {
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
    
    // Build request for Vertex AI VEO (predictLongRunning)
    const modelPath = `projects/${projectId}/locations/${location}/publishers/google/models/${modelId}`;
    const startUrl = `https://${location}-aiplatform.googleapis.com/v1/${modelPath}:predictLongRunning`;
    
    // Prepare image conditioning if provided
    let imageInstance: Record<string, unknown> | null = null;
    let lastFrameInstance: Record<string, unknown> | null = null;
    
    if (generationData.startImage) {
      console.log('🖼️ Image conditioning enabled - preparing start image');
      imageInstance = await prepareImageForVeo(generationData.startImage);
    }
    
    if (generationData.endImage) {
      console.log('🖼️ End frame conditioning enabled - preparing end image');
      lastFrameInstance = await prepareImageForVeo(generationData.endImage);
    }
    
    const requestBody = {
      instances: [
        {
          prompt: String(generationData.prompt || ''),
          // Add image conditioning if startImage provided (for image-to-video)
          ...(imageInstance && { image: imageInstance }),
          // Add end frame conditioning if endImage provided
          ...(lastFrameInstance && { lastFrame: lastFrameInstance }),
        },
      ],
      parameters: {
        ...(generationData.negativePrompt ? { negativePrompt: String(generationData.negativePrompt) } : {}),
        durationSeconds: Number(normalizeDuration(generationData.duration)),
        aspectRatio: String(generationData.aspectRatio || '16:9'),
        generateAudio: false,
      },
    } as Record<string, unknown>;

    console.log('🚀 Calling Vertex AI VEO predictLongRunning');
    console.log('🔧 Endpoint:', startUrl);
    console.log('📝 Prompt (truncated):', String(generationData.prompt).slice(0, 120));
    console.log('🎯 Image conditioning:', imageInstance ? 'Start image provided' : 'None');
    console.log('🎯 End frame:', lastFrameInstance ? 'End image provided' : 'None');

    // Update progress: Calling VEO API
    await supabaseClient
      .from('video_generations')
      .update({ progress: 60 })
      .eq('id', generationId);

    const startRes = await fetch(startUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const ct = startRes.headers.get('content-type') || '';
    const startData = ct.includes('application/json') ? await startRes.json() : { raw: await startRes.text() };
    console.log('📋 Start status:', startRes.status);

    if (!startRes.ok) {
      console.error('❌ VEO start error:', typeof startData === 'string' ? startData : JSON.stringify(startData, null, 2));
      const errMsg = (startData && startData.error && startData.error.message) || (typeof startData === 'string' ? startData.slice(0, 200) : 'Unknown error');
      throw new Error(`VEO API Error (${startRes.status}): ${errMsg}`);
    }

    // Persist the model/location actually used
    await supabaseClient
      .from('video_generations')
      .update({ generation_data: { ...generationData, model: modelId, location } })
      .eq('id', generationId);

    // Determine operation name from response
    let operationName: string | null = null;
    try {
      const maybe: any = startData;
      if (maybe) {
        if (typeof maybe.name === 'string') operationName = maybe.name;
        else if (typeof maybe.operation === 'string') operationName = maybe.operation;
        else if (maybe.operation && typeof maybe.operation.name === 'string') operationName = maybe.operation.name;
        else if (typeof maybe.id === 'string') operationName = maybe.id;
      }
    } catch (_) {}
    console.log('🆔 Operation name from start response:', operationName);

    if (!operationName) {
      throw new Error('Start response missing operation name');
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
    
    const pollUrl = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${modelId}:fetchPredictOperation`;
    console.log('📡 Poll URL:', pollUrl);

    const maxAttempts = 120; // ~10 minutes @ 5s
    let attempt = 0;
    let videoUrl: string | null = null;

    while (attempt < maxAttempts) {
      attempt++;
      await new Promise((r) => setTimeout(r, 5000));

      const opRes = await fetch(pollUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName }),
      });

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
        
        // Enhanced VEO response parsing - log full response for debugging
        console.log('🔍 Full VEO operation response:', JSON.stringify(opData, null, 2));
        
        // Comprehensive search for video URLs in the response
        videoUrl = findVideoUrlInResponse(opData);
        
        if (videoUrl) {
          console.log('✅ Found video URL:', videoUrl);
        } else {
          console.warn('⚠️ No video URL found in response structure, checking for base64 video data...');
          
          // VEO 3.0 returns base64-encoded video data instead of a URL
          const base64Video = opData?.response?.videos?.[0]?.bytesBase64Encoded;
          if (base64Video && typeof base64Video === 'string' && base64Video.length > 100) {
            console.log(`📦 Found base64-encoded video (${Math.round(base64Video.length * 0.75 / 1024 / 1024)} MB), decoding and uploading...`);
            const binaryStr = atob(base64Video);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
              bytes[i] = binaryStr.charCodeAt(i);
            }
            const fileName = `veo-${generationId}-${Date.now()}.mp4`;
            const filePath = `generated/${fileName}`;
            const { error: uploadError } = await supabaseClient.storage
              .from('generated-videos')
              .upload(filePath, bytes, { contentType: 'video/mp4', upsert: false });
            if (uploadError) {
              console.error('❌ Failed to upload base64 video:', uploadError);
              throw new Error(`Base64 video upload failed: ${uploadError.message}`);
            }
            const { data: urlData } = supabaseClient.storage
              .from('generated-videos')
              .getPublicUrl(filePath);
            videoUrl = urlData?.publicUrl || null;
            console.log('✅ Base64 video uploaded successfully, URL:', videoUrl);
          }
        }
        break;
      }
    }

    console.log('🏁 Polling finished. Video URL found:', Boolean(videoUrl));

    if (!videoUrl) {
      console.error('❌ No video URL discovered in VEO operation response after completion');
      throw new Error('VEO generation completed but returned no video URL');
    }

    // Convert gs:// URI to usable public URL
    let publicVideoUrl: string;
    if (videoUrl.startsWith('gs://')) {
      console.log('🔄 Converting Google Storage URI to public URL...');
      try {
        publicVideoUrl = await convertGsUriToPublicUrl(videoUrl, supabaseClient, generationId);
        console.log('✅ Successfully converted to public URL:', publicVideoUrl.substring(0, 120) + '...');
      } catch (convertError) {
        console.error('❌ Failed to convert gs:// URI to public URL:', convertError);
        throw new Error(`Failed to make video accessible: ${convertError.message}`);
      }
    } else {
      publicVideoUrl = videoUrl;
    }

    // Update progress: Processing response
    await supabaseClient
      .from('video_generations')
      .update({
        progress: 80,
      })
      .eq('id', generationId);

    // Update progress: Updating Salesforce
    await supabaseClient
      .from('video_generations')
      .update({
        progress: 90,
      })
      .eq('id', generationId);

    // Get the media_url_key and model info for Salesforce integration
    const { data: generationRecord } = await supabaseClient
      .from('video_generations')
      .select('media_url_key, generation_data')
      .eq('id', generationId)
      .single();

    // Update Salesforce if media_url_key exists
    if (generationRecord?.media_url_key) {
      try {
        console.log(`🔄 Updating Salesforce for Media URL Key: ${generationRecord.media_url_key}`);
        const genData = generationRecord.generation_data || {};
        const modelUsed = genData.model || 'veo-2';
        await updateSalesforceContent(generationRecord.media_url_key, publicVideoUrl, 'Google', modelUsed);
        console.log(`✅ Salesforce content updated successfully for key: ${generationRecord.media_url_key}`);
      } catch (salesforceError) {
        console.error(`❌ Failed to update Salesforce content:`, salesforceError);
        // Don't fail the whole operation for Salesforce errors, just log them
      }
    }

    await supabaseClient
      .from('video_generations')
      .update({
        status: 'completed',
        progress: 100,
        video_url: publicVideoUrl,
        error_message: null,
      })
      .eq('id', generationId);

    console.log(`✅ VEO generation ${generationId} completed successfully`);
    console.log(`🎥 Public Video URL: ${publicVideoUrl.substring(0, 120)}...`);
    
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

// Helper function to find video URL in VEO response with comprehensive search
function findVideoUrlInResponse(responseData: any): string | null {
  // Targeted search for known response shapes (covers Vertex variants you mentioned)
  const searchPaths = [
    // Standard and common shapes
    'response.videos[0].gcsUri',
    'response.videos[0].uri',
    'response.videos[0].url',
    'response.videos[0].videoUri',
    'response.videos[0].downloadUri', // note: Uri variant

    // Output shortcuts on response
    'response.output.gcsUri',
    'response.output.uri',
    'response.output.url',
    'response.outputUri',
    'response.videoUri',

    // Predictions variants
    'response.predictions[0].gcsUri',
    'response.predictions[0].uri',
    'response.predictions[0].url',
    'response.predictions[0].content[0].video.uri',

    // Result and artifacts variants
    'response.result.outputUri',
    'response.artifacts[0].uri',

    // Direct (non-nested) fallbacks sometimes returned
    'videos[0].gcsUri', 'videos[0].uri', 'videos[0].url',
    'artifacts[0].uri',
    'result.outputUri',
    'content[0].video.uri',

    // Absolute minimal paths
    'gcsUri', 'uri', 'url', 'videoUri', 'downloadUri', 'outputUri'
  ];

  const getByPath = (obj: any, path: string) => {
    let current = obj;
    const parts = path.split('.');
    for (const part of parts) {
      if (part.includes('[') && part.includes(']')) {
        const [arrayKey, indexStr] = part.split('[');
        const index = parseInt(indexStr.replace(']', ''));
        current = current?.[arrayKey]?.[index];
      } else {
        current = current?.[part];
      }
      if (current === undefined || current === null) break;
    }
    return current;
  };

  for (const path of searchPaths) {
    try {
      const val = getByPath(responseData, path);
      if (typeof val === 'string' && (val.startsWith('gs://') || val.startsWith('http'))) {
        console.log(`✅ Found video URL at path ${path}: ${val}`);
        return val;
      }
    } catch (_) {}
  }

  // Generic recursive fallback: find any field named *uri/*url with a usable value
  const candidates: string[] = [];
  const visit = (obj: any) => {
    if (!obj) return;
    if (Array.isArray(obj)) { for (const item of obj) visit(item); return; }
    if (typeof obj !== 'object') return;
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && (value.startsWith('gs://') || value.startsWith('http'))) {
        if (/(^|[^a-zA-Z])(uri|url)$/i.test(key) || /video/i.test(key)) {
          candidates.push(value);
        }
      } else if (value && typeof value === 'object') {
        visit(value);
      }
    }
  };
  visit(responseData);

  if (candidates.length > 0) {
    // Prefer HTTPS over GS if available
    const httpsCandidate = candidates.find(c => c.startsWith('http'));
    const chosen = httpsCandidate || candidates[0];
    console.log('🔎 Fallback URI candidates:', candidates);
    console.log('✅ Selected fallback video URL:', chosen);
    return chosen;
  }

  console.warn('❌ No video URL found in any expected response path or fallback scan');
  return null;
}

// Helper function to convert gs:// URI to public URL via Supabase storage
async function convertGsUriToPublicUrl(gsUri: string, supabaseClient: any, generationId: string): Promise<string> {
  console.log('📥 Downloading video from Google Storage:', gsUri);
  
  // Extract bucket and object path from gs:// URI
  const gsMatch = gsUri.match(/^gs:\/\/([^\/]+)\/(.+)$/);
  if (!gsMatch) {
    throw new Error('Invalid gs:// URI format');
  }
  
  const [, bucket, objectPath] = gsMatch;
  
  // Get Google Cloud credentials for accessing the file
  const serviceAccountKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
  if (!serviceAccountKey) {
    throw new Error('Google Service Account Key not found');
  }
  
  const credentials = JSON.parse(serviceAccountKey);
  const accessToken = await getAccessToken(credentials);
  
  // Download the video file from Google Cloud Storage
  const downloadUrl = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(objectPath)}?alt=media`;
  console.log('⬇️ Downloading from:', downloadUrl);
  
  const downloadResponse = await fetch(downloadUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!downloadResponse.ok) {
    throw new Error(`Failed to download video: ${downloadResponse.status} ${downloadResponse.statusText}`);
  }
  
  const videoBlob = await downloadResponse.blob();
  const videoBuffer = await videoBlob.arrayBuffer();
  
  console.log('📦 Downloaded video size:', Math.round(videoBuffer.byteLength / 1024 / 1024), 'MB');
  
  // Generate a unique filename
  const fileName = `veo-${generationId}-${Date.now()}.mp4`;
  const filePath = `generated/${fileName}`;
  
  // Upload to Supabase storage
  console.log('☁️ Uploading to Supabase storage:', filePath);
  
  const { data: uploadData, error: uploadError } = await supabaseClient.storage
    .from('generated-videos')
    .upload(filePath, new Uint8Array(videoBuffer), {
      contentType: 'video/mp4',
      cacheControl: '3600',
      upsert: false
    });
    
  if (uploadError) {
    console.error('❌ Supabase storage upload error:', uploadError);
    throw new Error(`Failed to upload video to Supabase: ${uploadError.message}`);
  }
  
  console.log('✅ Successfully uploaded to Supabase storage');
  
  // Get the public URL
  const { data: urlData } = supabaseClient.storage
    .from('generated-videos')
    .getPublicUrl(filePath);
    
  if (!urlData?.publicUrl) {
    throw new Error('Failed to generate public URL for uploaded video');
  }
  
  return urlData.publicUrl;
}

// Helper function to query Salesforce for Content record ID using Media URL Key
async function querySalesforceContentId(mediaUrlKey: string): Promise<string | null> {
  try {
    const queryUrl = `https://api.realintelligence.com/api/wmc-content-by-key.py?orgId=00D5e000000HEcP&keyId=${encodeURIComponent(mediaUrlKey)}&sandbox=False`;
    console.log(`🔍 Querying Salesforce for Media URL Key: ${mediaUrlKey}`);
    console.log(`📡 Query URL: ${queryUrl}`);
    
    const response = await fetch(queryUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Salesforce query failed (${response.status}):`, errorText);
      throw new Error(`Salesforce query failed: ${response.status} - ${errorText}`);
    }

    const responseText = await response.text();
    console.log(`📋 Salesforce query response:`, responseText);
    
    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      // If not JSON, treat as plain text content ID
      const contentId = responseText.trim();
      if (contentId && contentId.length > 0) {
        console.log(`✅ Found Content ID: ${contentId}`);
        return contentId;
      }
      throw new Error('Empty or invalid response from Salesforce query');
    }

    // Handle JSON response
    if (data && data.Id) {
      console.log(`✅ Found Content ID from JSON: ${data.Id}`);
      return data.Id;
    } else if (data && data.contentId) {
      console.log(`✅ Found Content ID from JSON: ${data.contentId}`);
      return data.contentId;
    } else if (typeof data === 'string' && data.trim().length > 0) {
      console.log(`✅ Found Content ID as string: ${data.trim()}`);
      return data.trim();
    }

    console.warn(`⚠️ No Content ID found in response:`, data);
    return null;
  } catch (error) {
    console.error(`❌ Error querying Salesforce for Media URL Key ${mediaUrlKey}:`, error);
    throw error;
  }
}

// Helper function to update Salesforce Content record with video URL
async function updateSalesforceContent(mediaUrlKey: string, videoUrl: string, modelVendor?: string, modelUsed?: string): Promise<void> {
  try {
    // First, query Salesforce to get the Content record ID
    const contentId = await querySalesforceContentId(mediaUrlKey);
    
    if (!contentId) {
      throw new Error(`No Content record found for Media URL Key: ${mediaUrlKey}`);
    }

    console.log(`🔄 Updating Salesforce Content record ${contentId} with video URL`);
    
    // Update the Salesforce Content record with the video URL
    const updateUrl = 'https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/update-engine-content.php';
    
    const formData = new FormData();
    formData.append('contentId', contentId);
    formData.append('videoUrl', videoUrl);
    formData.append('status', 'Generated');
    
    // Add model vendor and model used
    if (modelVendor) {
      formData.append('modelVendor', modelVendor);
    }
    if (modelUsed) {
      formData.append('modelUsed', modelUsed);
    }
    
    console.log(`📡 Updating Salesforce Content via: ${updateUrl}`);
    console.log(`📝 Content ID: ${contentId}`);
    console.log(`🎥 Video URL: ${videoUrl.substring(0, 120)}...`);
    console.log(`🤖 Model: ${modelVendor} / ${modelUsed}`);
    
    const response = await fetch(updateUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Salesforce update failed (${response.status}):`, errorText);
      throw new Error(`Salesforce update failed: ${response.status} - ${errorText}`);
    }

    const responseText = await response.text();
    console.log(`✅ Salesforce update response:`, responseText);
    
  } catch (error) {
    console.error(`❌ Error updating Salesforce content for Media URL Key ${mediaUrlKey}:`, error);
    throw error;
  }
}
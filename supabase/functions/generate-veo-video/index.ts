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

    // Get Google VEO credentials
    const googleProjectId = Deno.env.get('GOOGLE_VEO_PROJECT_ID');
    const googleApiKey = Deno.env.get('GOOGLE_VEO_API_KEY');

    if (!googleProjectId || !googleApiKey) {
      console.error('Missing Google VEO credentials');
      throw new Error('Google VEO credentials not configured');
    }

    const salesforceData = requestData.salesforceData || {};
    const model = requestData.model || 'veo-3';
    const location = requestData.location || 'us-central1';
    
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

    // Step 3: Start video generation process
    const mockOperationName = `projects/${googleProjectId}/operations/mock-${videoGeneration.id}`;
    
    console.log('🎬 Starting video generation...');

    // Update generation record with mock operation ID and status
    const { error: updateError } = await supabaseClient
      .from('video_generations')
      .update({
        google_operation_id: mockOperationName,
        status: 'generating',
        progress: 10,
      })
      .eq('id', videoGeneration.id);

    if (updateError) {
      console.error('Error updating video generation:', updateError);
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
      API_Operation_ID__c: mockOperationName,
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
    EdgeRuntime.waitUntil(startVeoGeneration(videoGeneration.id, generationData, googleProjectId, googleApiKey, model, location));

    return new Response(JSON.stringify({
      success: true,
      generationId: videoGeneration.id,
      operationId: mockOperationName,
      salesforceSubmissionData: salesforceSubmissionData,
      message: 'Video generation started successfully (mock mode)',
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
async function startVeoGeneration(generationId: string, generationData: any, projectId: string, apiKey: string, model: string, location: string) {
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
    
    // Prepare VEO generation request
    const veoRequest = {
      contents: [{
        role: "user", 
        parts: [{
          text: `Create a ${generationData.duration}-second video in ${generationData.aspectRatio} aspect ratio: ${generationData.prompt}`
        }]
      }],
      generationConfig: {
        // Remove invalid parameters - VEO doesn't use response_modalities or response_mime_type
        maxOutputTokens: 1024,
        ...(generationData.creativity && generationData.creativity !== 1.0 && { temperature: generationData.creativity })
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT", 
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        },
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_MEDIUM_AND_ABOVE"
        }
      ]
    };

    // If negative prompt is provided, add it to the main prompt
    if (generationData.negativePrompt) {
      veoRequest.contents[0].parts[0].text += `. Avoid: ${generationData.negativePrompt}`;
    }

    console.log('🚀 Calling Google Vertex AI VEO API...');
    console.log('📝 Request prompt:', veoRequest.contents[0].parts[0].text);
    
    // Update progress: Calling VEO API
    await supabaseClient
      .from('video_generations')
      .update({
        progress: 60,
      })
      .eq('id', generationId);
    
    // Call Vertex AI VEO API using v1beta endpoint with correct model
    console.log(`🔧 Calling VEO ${model} via v1beta endpoint in ${location}`);
    const veoResponse = await fetch(
      `https://${location}-aiplatform.googleapis.com/v1beta/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(veoRequest),
      }
    );

    const responseData = await veoResponse.json();
    console.log('📋 VEO API Response Status:', veoResponse.status);
    console.log('📄 Response data keys:', Object.keys(responseData));
    
    if (!veoResponse.ok) {
      console.error('❌ VEO API Error Response:', JSON.stringify(responseData, null, 2));
      throw new Error(`VEO API Error (${veoResponse.status}): ${responseData.error?.message || JSON.stringify(responseData)}`);
    }

    // Update progress: Processing response
    await supabaseClient
      .from('video_generations')
      .update({
        progress: 80,
      })
      .eq('id', generationId);

    // Check if response contains video content
    if (responseData.candidates && responseData.candidates[0]?.content?.parts) {
      const parts = responseData.candidates[0].content.parts;
      console.log('📹 Response parts:', parts.length);
      
      // Look for video content in the parts
      let videoUrl = null;
      for (const part of parts) {
        if (part.inline_data && part.inline_data.mime_type === 'video/mp4') {
          console.log('✅ Video content found in response');
          // For demo purposes, create a data URL (in production, upload to storage)
          const videoBase64 = part.inline_data.data;
          videoUrl = `data:video/mp4;base64,${videoBase64}`;
          break;
        } else if (part.file_data && part.file_data.mime_type === 'video/mp4') {
          console.log('✅ Video file reference found in response');
          videoUrl = part.file_data.file_uri;
          break;
        }
      }
      
      if (videoUrl) {
        // Update generation record with completed status
        await supabaseClient
          .from('video_generations')
          .update({
            status: 'completed',
            progress: 100,
            video_url: videoUrl,
          })
          .eq('id', generationId);
        
        console.log(`✅ VEO generation ${generationId} completed successfully`);
        console.log(`🎥 Video URL: ${videoUrl.substring(0, 100)}...`);
        
      } else {
        console.error('❌ No video content found in VEO response parts');
        console.log('📄 Full response for debugging:', JSON.stringify(responseData, null, 2));
        throw new Error('No video content found in VEO API response');
      }
    } else {
      console.error('❌ Invalid VEO response structure');
      console.log('📄 Full response for debugging:', JSON.stringify(responseData, null, 2));
      throw new Error('Invalid response structure from VEO API - no candidates found');
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
  
  const tokenData = await tokenResponse.json();
  
  if (!tokenResponse.ok) {
    throw new Error(`Failed to get access token: ${tokenData.error_description}`);
  }
  
  return tokenData.access_token;
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
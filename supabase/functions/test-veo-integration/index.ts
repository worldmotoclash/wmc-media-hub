import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestRequest {
  action: 'test-salesforce' | 'test-veo-parsing' | 'test-gs-conversion';
  mediaUrlKey?: string;
  sampleVeoResponse?: any;
  gsUri?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: TestRequest = await req.json();
    console.log('🧪 Test request:', requestData.action);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    let result: any = {};

    if (requestData.action === 'test-salesforce' && requestData.mediaUrlKey) {
      console.log('🔍 Testing Salesforce lookup for key:', requestData.mediaUrlKey);
      
      try {
        const contentId = await querySalesforceContentId(requestData.mediaUrlKey);
        result = {
          success: true,
          mediaUrlKey: requestData.mediaUrlKey,
          contentId: contentId,
          message: contentId ? 'Salesforce record found successfully' : 'No Salesforce record found for this key'
        };
      } catch (error) {
        result = {
          success: false,
          mediaUrlKey: requestData.mediaUrlKey,
          error: error.message,
          message: 'Failed to query Salesforce'
        };
      }
      
    } else if (requestData.action === 'test-veo-parsing' && requestData.sampleVeoResponse) {
      console.log('🎬 Testing VEO response parsing');
      
      const videoUrl = findVideoUrlInResponse(requestData.sampleVeoResponse);
      result = {
        success: true,
        foundVideoUrl: videoUrl,
        message: videoUrl ? `Video URL found: ${videoUrl}` : 'No video URL found in response',
        responseKeys: Object.keys(requestData.sampleVeoResponse || {})
      };
      
    } else if (requestData.action === 'test-gs-conversion' && requestData.gsUri) {
      console.log('☁️ Testing gs:// URI conversion for:', requestData.gsUri);
      
      try {
        // Create a test generation ID for the conversion
        const testGenerationId = `test-${Date.now()}`;
        const publicUrl = await convertGsUriToPublicUrl(requestData.gsUri, supabaseClient, testGenerationId);
        
        result = {
          success: true,
          originalGsUri: requestData.gsUri,
          publicUrl: publicUrl,
          message: 'Successfully converted gs:// URI to public URL'
        };
      } catch (error) {
        result = {
          success: false,
          originalGsUri: requestData.gsUri,
          error: error.message,
          message: 'Failed to convert gs:// URI'
        };
      }
      
    } else {
      throw new Error('Invalid test action or missing required parameters');
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in test function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Copy of helper functions from generate-veo-video for testing
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

function findVideoUrlInResponse(responseData: any): string | null {
  // Search patterns for video URLs
  const searchPaths = [
    // Standard VEO paths
    'response.videos[0].gcsUri',
    'response.videos[0].uri',
    'response.videos[0].url',
    'response.videos[0].videoUri',
    'response.videos[0].downloadUrl',
    
    // Alternative response structures
    'response.predictions[0].gcsUri',
    'response.predictions[0].uri', 
    'response.predictions[0].url',
    'response.output.gcsUri',
    'response.output.uri',
    'response.output.url',
    
    // Direct response paths
    'videos[0].gcsUri',
    'videos[0].uri',
    'videos[0].url',
    'predictions[0].gcsUri',
    'predictions[0].uri',
    'output.gcsUri',
    'output.uri',
    'gcsUri',
    'uri',
    'url'
  ];

  for (const path of searchPaths) {
    try {
      let current = responseData;
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
      
      if (typeof current === 'string' && (current.startsWith('gs://') || current.startsWith('http'))) {
        console.log(`✅ Found video URL at path ${path}: ${current}`);
        return current;
      }
    } catch (e) {
      // Continue searching
    }
  }
  
  console.warn('❌ No video URL found in any expected response path');
  return null;
}

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
  const fileName = `test-${generationId}-${Date.now()}.mp4`;
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
    const msg = tokenData?.error_description || tokenData?.error || 'Unknown token error';
    throw new Error(`Failed to get access token: ${msg}`);
  }
  
  return tokenData.access_token;
}

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
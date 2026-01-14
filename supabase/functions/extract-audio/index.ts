import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';
import { getS3Config, getCdnUrl, S3_PATHS } from '../_shared/s3Config.ts';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtractAudioRequest {
  sourceVideoUrl: string;
  userId: string;
  outputFormat?: 'mp3' | 'aac' | 'wav';
}

/**
 * Edge function to extract audio from a video file.
 * 
 * Since FFmpeg cannot run in Deno edge runtime, this function uses an 
 * external audio extraction service or returns the video URL directly
 * for models that can handle audio extraction themselves.
 * 
 * For now, we'll use a pragmatic approach:
 * - Return the source video URL for the infinitetalk model which can
 *   extract audio from video sources directly
 * - In the future, this can be enhanced to use an external FFmpeg service
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: ExtractAudioRequest = await req.json();
    
    if (!requestData.sourceVideoUrl) {
      throw new Error('Source video URL is required');
    }
    
    if (!requestData.userId) {
      throw new Error('User ID is required');
    }

    console.log('🎵 Audio extraction requested for:', requestData.sourceVideoUrl);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // For now, we return the source video URL since the infinitetalk model
    // and other audio-based models can handle video input and extract audio themselves.
    // 
    // This is a pragmatic solution because:
    // 1. FFmpeg cannot run in Deno edge runtime
    // 2. The video generation models typically support video input for audio extraction
    // 3. This allows the workflow to function while a proper server-side solution is developed
    
    const sourceUrl = requestData.sourceVideoUrl;
    
    // Validate the source URL is accessible
    try {
      const headResponse = await fetch(sourceUrl, { method: 'HEAD' });
      if (!headResponse.ok) {
        throw new Error(`Source video not accessible: ${headResponse.status}`);
      }
      
      const contentType = headResponse.headers.get('content-type') || '';
      const contentLength = headResponse.headers.get('content-length');
      
      console.log('✅ Source video validated:', {
        contentType,
        contentLength: contentLength ? `${Math.round(parseInt(contentLength) / 1024 / 1024)}MB` : 'unknown'
      });
      
      // Determine if it's a video file
      const isVideo = contentType.includes('video') || 
                      sourceUrl.includes('.mp4') || 
                      sourceUrl.includes('.mov') ||
                      sourceUrl.includes('.webm');
      
      if (!isVideo) {
        console.warn('⚠️ Source may not be a video file:', contentType);
      }
      
    } catch (fetchError) {
      console.error('Failed to validate source URL:', fetchError);
      throw new Error('Source video URL is not accessible');
    }

    // Generate a unique audio reference ID
    const audioRefId = crypto.randomUUID();
    const s3Key = `${S3_PATHS.GENERATION_INPUTS}/audio-refs/${requestData.userId}/${audioRefId}`;
    
    // For video sources, we return the video URL directly
    // The model (infinitetalk) will extract audio from the video
    const result = {
      success: true,
      audioUrl: sourceUrl, // Video URL - model will extract audio
      audioRefId,
      method: 'video-passthrough',
      message: 'Video URL provided for audio extraction by generation model',
      metadata: {
        sourceVideoUrl: sourceUrl,
        userId: requestData.userId,
        extractedAt: new Date().toISOString(),
      }
    };

    console.log('🎵 Audio reference created:', result.audioRefId);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Audio extraction error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

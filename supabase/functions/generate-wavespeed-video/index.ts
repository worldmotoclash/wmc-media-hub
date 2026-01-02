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
  visualAnchors?: string[];
  negativeConstraints?: string[];
}

// Interface for the Wavespeed generation request
interface WavespeedGenerationRequest {
  userId: string;
  creatorContactId?: string; // Salesforce Contact ID of the creator
  model: string;
  prompt: string;
  durationSec?: number;
  resolution?: string;
  aspectRatio?: string;
  references?: {
    characterImages?: string[];
    logoImages?: string[];
  };
  audioUrl?: string;
  imageUrl?: string;
  startImage?: string;
  endImage?: string;
  sourceVideoUrl?: string; // For video extend models
  styleProfile?: StyleProfile;
  styleOverride?: string;
  extras?: Record<string, any>;
  mediaUrlKey?: string;
  salesforceData?: Record<string, any>;
}

// Wavespeed model configurations
const WAVESPEED_MODELS: Record<string, {
  url: string;
  buildPayload: (args: any) => any;
  estimatedCostPer5s?: number;
}> = {
  'vidu_ref2': {
    url: 'https://api.wavespeed.ai/api/vidu/reference-to-video-2.0',
    buildPayload: ({ prompt, durationSec, resolution, references, extras }) => ({
      prompt,
      duration: durationSec,
      resolution: resolution || '720p',
      reference_images: [
        ...(references?.characterImages || []),
        ...(references?.logoImages || [])
      ],
      ...extras
    }),
    estimatedCostPer5s: 0.25
  },
  'wan_fun': {
    url: 'https://api.wavespeed.ai/api/v3/wavespeed-ai/wan-2.2/t2v-720p',
    buildPayload: ({ prompt, durationSec, aspectRatio, resolution, extras }) => {
      const size = (aspectRatio === '9:16' || resolution === 'vertical') ? '720*1280' : '1280*720';
      const allowedDurations = [5, 8] as const;
      const d = typeof durationSec === 'number' ? durationSec : 5;
      const duration = allowedDurations.includes(d as any) ? d : (d >= 8 ? 8 : 5);
      return {
        prompt,
        size,
        duration,
        seed: -1,
        ...extras
      };
    },
    estimatedCostPer5s: 0.20
  },
  'infinitetalk': {
    url: 'https://api.wavespeed.ai/api/infinitetalk',
    buildPayload: ({ audioUrl, imageUrl, durationSec, resolution }) => ({
      audio_url: audioUrl,
      image_url: imageUrl,
      duration: durationSec,
      resolution: resolution || '480p'
    }),
    estimatedCostPer5s: 0.15
  },
  'kling_pro': {
    url: 'https://api.wavespeed.ai/api/kling/pro',
    buildPayload: ({ prompt, durationSec, aspectRatio, resolution, extras }) => {
      const duration = Math.min(Math.max(durationSec || 5, 5), 10);
      return {
        prompt,
        duration,
        aspect_ratio: aspectRatio || '16:9',
        resolution: resolution || '1080p',
        ...extras
      };
    },
    estimatedCostPer5s: 1.20
  },
  'kling_standard': {
    url: 'https://api.wavespeed.ai/api/kling/standard',
    buildPayload: ({ prompt, durationSec, aspectRatio, resolution, extras }) => {
      const duration = Math.min(durationSec || 5, 5);
      return {
        prompt,
        duration,
        aspect_ratio: aspectRatio || '16:9',
        resolution: resolution || '720p',
        ...extras
      };
    },
    estimatedCostPer5s: 0.70
  },
  'minimax_video_01': {
    url: 'https://api.wavespeed.ai/api/minimax/video-01',
    buildPayload: ({ prompt, durationSec, aspectRatio, resolution, extras }) => {
      const duration = Math.min(durationSec || 6, 6);
      return {
        prompt,
        duration,
        aspect_ratio: aspectRatio || '16:9',
        resolution: resolution || '1080p',
        ...extras
      };
    },
    estimatedCostPer5s: 0.90
  },
  'minimax_lite': {
    url: 'https://api.wavespeed.ai/api/minimax/lite',
    buildPayload: ({ prompt, durationSec, aspectRatio, resolution, extras }) => {
      const duration = Math.min(durationSec || 6, 6);
      return {
        prompt,
        duration,
        aspect_ratio: aspectRatio || '16:9',
        resolution: resolution || '720p',
        ...extras
      };
    },
    estimatedCostPer5s: 0.45
  },
  'vidu_i2v': {
    url: 'https://api.wavespeed.ai/api/v3/vidu/image-to-video-2.0',
    buildPayload: ({ prompt, durationSec, imageUrl, extras }) => {
      const duration = [4, 8].includes(durationSec) ? durationSec : 4;
      return {
        image: imageUrl,
        prompt: prompt || '',
        duration,
        movement_amplitude: 'auto',
        ...extras
      };
    },
    estimatedCostPer5s: 0.30
  },
  'vidu_start_end': {
    url: 'https://api.wavespeed.ai/api/v3/vidu/start-end-to-video-2.0',
    buildPayload: ({ prompt, durationSec, startImage, endImage, extras }) => {
      const duration = [4, 8].includes(durationSec) ? durationSec : 4;
      return {
        start_image: startImage,
        end_image: endImage,
        prompt: prompt || '',
        duration,
        movement_amplitude: 'auto',
        ...extras
      };
    },
    estimatedCostPer5s: 0.35
  },
  // Luma Models
  'luma_dream_machine': {
    url: 'https://api.wavespeed.ai/api/v3/luma/dream-machine-1.6',
    buildPayload: ({ prompt, durationSec, imageUrl, aspectRatio, extras }) => ({
      prompt: prompt || '',
      image_url: imageUrl,
      duration: Math.min(durationSec || 5, 5),
      aspect_ratio: aspectRatio || '16:9',
      ...extras
    }),
    estimatedCostPer5s: 0.80
  },
  'luma_ray': {
    url: 'https://api.wavespeed.ai/api/v3/luma/ray',
    buildPayload: ({ prompt, durationSec, imageUrl, aspectRatio, extras }) => ({
      prompt: prompt || '',
      image_url: imageUrl,
      duration: Math.min(durationSec || 5, 5),
      aspect_ratio: aspectRatio || '16:9',
      ...extras
    }),
    estimatedCostPer5s: 0.35
  },
  // Pika Models
  'pika_1_5': {
    url: 'https://api.wavespeed.ai/api/v3/pika/1.5',
    buildPayload: ({ prompt, durationSec, imageUrl, aspectRatio, extras }) => ({
      prompt: prompt || '',
      image_url: imageUrl,
      duration: [3, 4].includes(durationSec) ? durationSec : 4,
      aspect_ratio: aspectRatio || '16:9',
      ...extras
    }),
    estimatedCostPer5s: 0.60
  },
  'pika_1_0': {
    url: 'https://api.wavespeed.ai/api/v3/pika/1.0',
    buildPayload: ({ prompt, durationSec, imageUrl, aspectRatio, extras }) => ({
      prompt: prompt || '',
      image_url: imageUrl,
      duration: 3,
      aspect_ratio: aspectRatio || '16:9',
      ...extras
    }),
    estimatedCostPer5s: 0.40
  },
  // Veo 3.1 Video Extend Models
  'veo31_extend': {
    url: 'https://api.wavespeed.ai/api/v3/google/veo-3.1/video-extend',
    buildPayload: ({ prompt, durationSec, sourceVideoUrl, aspectRatio, extras }) => ({
      video_url: sourceVideoUrl,
      prompt: prompt || '',
      duration: durationSec || 10,
      aspect_ratio: aspectRatio || '16:9',
      preserve_audio: true,
      preserve_style: true,
      ...extras
    }),
    estimatedCostPer5s: 0.25
  },
  'veo31_fast_extend': {
    url: 'https://api.wavespeed.ai/api/v3/google/veo-3.1-fast/video-extend',
    buildPayload: ({ prompt, durationSec, sourceVideoUrl, aspectRatio, extras }) => ({
      video_url: sourceVideoUrl,
      prompt: prompt || '',
      duration: Math.min(durationSec || 10, 20),
      aspect_ratio: aspectRatio || '16:9',
      preserve_audio: true,
      preserve_style: true,
      ...extras
    }),
    estimatedCostPer5s: 0.10
  },
  // Veo 3.1 Standard Models
  'veo31': {
    url: 'https://api.wavespeed.ai/api/v3/google/veo-3.1',
    buildPayload: ({ prompt, durationSec, aspectRatio, resolution, extras }) => ({
      prompt,
      duration: Math.min(durationSec || 10, 30),
      aspect_ratio: aspectRatio || '16:9',
      resolution: resolution || '1080p',
      ...extras
    }),
    estimatedCostPer5s: 0.30
  },
  'veo31_fast': {
    url: 'https://api.wavespeed.ai/api/v3/google/veo-3.1-fast',
    buildPayload: ({ prompt, durationSec, aspectRatio, resolution, extras }) => ({
      prompt,
      duration: Math.min(durationSec || 10, 30),
      aspect_ratio: aspectRatio || '16:9',
      resolution: resolution || '1080p',
      ...extras
    }),
    estimatedCostPer5s: 0.12
  },
  'veo31_i2v': {
    url: 'https://api.wavespeed.ai/api/v3/google/veo-3.1/image-to-video',
    buildPayload: ({ prompt, durationSec, imageUrl, aspectRatio, extras }) => ({
      image_url: imageUrl,
      prompt: prompt || '',
      duration: Math.min(durationSec || 10, 20),
      aspect_ratio: aspectRatio || '16:9',
      ...extras
    }),
    estimatedCostPer5s: 0.28
  },
  'veo31_fast_i2v': {
    url: 'https://api.wavespeed.ai/api/v3/google/veo-3.1-fast/image-to-video',
    buildPayload: ({ prompt, durationSec, imageUrl, aspectRatio, extras }) => ({
      image_url: imageUrl,
      prompt: prompt || '',
      duration: Math.min(durationSec || 10, 15),
      aspect_ratio: aspectRatio || '16:9',
      ...extras
    }),
    estimatedCostPer5s: 0.10
  },
  'veo31_r2v': {
    url: 'https://api.wavespeed.ai/api/v3/google/veo-3.1/reference-to-video',
    buildPayload: ({ prompt, durationSec, sourceVideoUrl, aspectRatio, extras }) => ({
      reference_video_url: sourceVideoUrl,
      prompt: prompt || '',
      duration: Math.min(durationSec || 10, 20),
      aspect_ratio: aspectRatio || '16:9',
      ...extras
    }),
    estimatedCostPer5s: 0.35
  },
  // Veo 3 Models
  'veo3': {
    url: 'https://api.wavespeed.ai/api/v3/google/veo-3',
    buildPayload: ({ prompt, durationSec, aspectRatio, resolution, extras }) => ({
      prompt,
      duration: Math.min(durationSec || 10, 30),
      aspect_ratio: aspectRatio || '16:9',
      resolution: resolution || '1080p',
      ...extras
    }),
    estimatedCostPer5s: 0.28
  },
  'veo3_fast': {
    url: 'https://api.wavespeed.ai/api/v3/google/veo-3-fast',
    buildPayload: ({ prompt, durationSec, aspectRatio, resolution, extras }) => ({
      prompt,
      duration: Math.min(durationSec || 10, 30),
      aspect_ratio: aspectRatio || '16:9',
      resolution: resolution || '1080p',
      ...extras
    }),
    estimatedCostPer5s: 0.10
  },
  'veo3_i2v': {
    url: 'https://api.wavespeed.ai/api/v3/google/veo-3/image-to-video',
    buildPayload: ({ prompt, durationSec, imageUrl, aspectRatio, extras }) => ({
      image_url: imageUrl,
      prompt: prompt || '',
      duration: Math.min(durationSec || 10, 20),
      aspect_ratio: aspectRatio || '16:9',
      ...extras
    }),
    estimatedCostPer5s: 0.25
  },
  'veo3_fast_i2v': {
    url: 'https://api.wavespeed.ai/api/v3/google/veo-3-fast/image-to-video',
    buildPayload: ({ prompt, durationSec, imageUrl, aspectRatio, extras }) => ({
      image_url: imageUrl,
      prompt: prompt || '',
      duration: Math.min(durationSec || 10, 15),
      aspect_ratio: aspectRatio || '16:9',
      ...extras
    }),
    estimatedCostPer5s: 0.08
  },
  'veo2_i2v': {
    url: 'https://api.wavespeed.ai/api/v3/google/veo-2/image-to-video',
    buildPayload: ({ prompt, durationSec, imageUrl, aspectRatio, extras }) => ({
      image_url: imageUrl,
      prompt: prompt || '',
      duration: Math.min(durationSec || 10, 15),
      aspect_ratio: aspectRatio || '16:9',
      ...extras
    }),
    estimatedCostPer5s: 0.15
  }
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Wavespeed video generation request from user:', req.headers.get('authorization')?.split(' ')[1]?.substring(0, 15) || 'unknown');
    
    const requestData: WavespeedGenerationRequest = await req.json();
    console.log('Model:', requestData.model, 'Prompt:', requestData.prompt?.substring(0, 50) + '...');

    if (!requestData.userId) {
      throw new Error('User ID is required');
    }

    if (!requestData.model || !WAVESPEED_MODELS[requestData.model]) {
      throw new Error('Invalid or unsupported model');
    }

    // Get Wavespeed API key
    const wavespeedApiKey = Deno.env.get('WAVESPEED_API_KEY');
    if (!wavespeedApiKey) {
      throw new Error('Wavespeed API key not configured');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const modelConfig = WAVESPEED_MODELS[requestData.model];
    const salesforceData = requestData.salesforceData || {};
    
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
    
    // Build the generation data
    const generationData = {
      model: requestData.model,
      prompt: enhancedPrompt,
      originalPrompt: requestData.prompt,
      durationSec: requestData.durationSec || 8,
      resolution: requestData.resolution || '720p',
      aspectRatio: requestData.aspectRatio || '16:9',
      references: requestData.references,
      audioUrl: requestData.audioUrl,
      imageUrl: requestData.imageUrl,
      startImage: requestData.startImage,
      endImage: requestData.endImage,
      sourceVideoUrl: requestData.sourceVideoUrl, // For video extend models
      extras: requestData.extras,
      salesforceData: salesforceData,
      hasStyleProfile: !!requestData.styleProfile,
      creatorContactId: requestData.creatorContactId,
    };

    // Create Supabase record first
    console.log('📝 Creating Wavespeed video generation record in Supabase...');
    
    const { data: videoGeneration, error: insertError } = await supabaseClient
      .from('video_generations')
      .insert({
        user_id: requestData.userId,
        provider: 'wavespeed',
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

    // Prepare Salesforce submission data
    const salesforceSubmissionData = {
      Name: salesforceData.title || `AI Generated Video - ${new Date().toISOString()}`,
      ri1__Subtitle__c: salesforceData.subtitle || '',
      ri1__Description__c: salesforceData.description || '',
      ri1__URL__c: '', // Will be updated after video generation
      ri1__Length_in_Seconds__c: generationData.durationSec,
      ri1__Aspect_Ratio__c: generationData.aspectRatio,
      AI_Prompt__c: generationData.prompt,
      AI_Model__c: requestData.model,
      ri1__Generation_Status__c: 'PENDING',
      ri1__Generation_Progress__c: 0,
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

    // Start Wavespeed generation process
    EdgeRuntime.waitUntil(startWavespeedGeneration(
      videoGeneration.id, 
      requestData.model, 
      generationData, 
      wavespeedApiKey
    ));

    return new Response(JSON.stringify({
      success: true,
      generationId: videoGeneration.id,
      provider: 'wavespeed',
      model: requestData.model,
      salesforceSubmissionData: salesforceSubmissionData,
      estimatedCost: modelConfig.estimatedCostPer5s ? 
        Math.ceil(generationData.durationSec / 5) * modelConfig.estimatedCostPer5s : 
        null,
      message: 'Wavespeed video generation started',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-wavespeed-video function:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Wavespeed generation process using their API
async function startWavespeedGeneration(
  generationId: string, 
  model: string, 
  generationData: any, 
  apiKey: string
) {
  console.log(`🌊 Starting Wavespeed generation for ${generationId} with model ${model}`);
  
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    // Update progress: Starting
    await supabaseClient
      .from('video_generations')
      .update({
        status: 'generating',
        progress: 20,
      })
      .eq('id', generationId);

    const modelConfig = WAVESPEED_MODELS[model];
    if (!modelConfig) {
      throw new Error(`Unsupported model: ${model}`);
    }

    // Build the request payload
    const payload = modelConfig.buildPayload(generationData);
    console.log('🚀 Calling Wavespeed API for model:', model);
    console.log('📝 Payload (sanitized):', JSON.stringify({ 
      ...payload, 
      prompt: payload.prompt?.substring(0, 50) + '...' 
    }));

    // Make the request to Wavespeed
    const response = await fetch(modelConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Wavespeed API error (${response.status}):`, errorText);
      throw new Error(`Wavespeed API error (${response.status}): ${errorText}`);
    }

    const responseData = await response.json();
    console.log('📋 Wavespeed response:', JSON.stringify(responseData, null, 2));

    // Extract job/task ID from response (supports wrapper {data:{id}})
    const jobId = responseData.data?.id || responseData.task_id || responseData.job_id || responseData.id;
    if (!jobId) {
      throw new Error('No job ID returned from Wavespeed API');
    }

    // Update with job ID
    await supabaseClient
      .from('video_generations')
      .update({
        google_operation_id: jobId, // Reusing this field for Wavespeed job ID
        progress: 40,
      })
      .eq('id', generationId);

    console.log('🆔 Wavespeed job ID:', jobId);

    // Start polling for completion
    await pollWavespeedStatus(generationId, jobId, apiKey, supabaseClient);

  } catch (error) {
    console.error(`❌ Error in Wavespeed generation for ${generationId}:`, error);
    
    // Mark as failed
    await supabaseClient
      .from('video_generations')
      .update({
        status: 'failed',
        progress: 0,
        error_message: `Wavespeed generation failed: ${error.message}`,
      })
      .eq('id', generationId);
  }
}

// Poll Wavespeed job status until completion
async function pollWavespeedStatus(
  generationId: string, 
  jobId: string, 
  apiKey: string, 
  supabaseClient: any
) {
  const maxAttempts = 60; // ~5 minutes @ 5s intervals
  let attempt = 0;

  while (attempt < maxAttempts) {
    attempt++;
    await new Promise(resolve => setTimeout(resolve, 5000));

    try {
      // Poll Wavespeed result endpoint (v3)
      const statusUrl = `https://api.wavespeed.ai/api/v3/predictions/${jobId}/result`;
      const statusResponse = await fetch(statusUrl, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!statusResponse.ok) {
        console.warn(`⚠️ Status poll failed (${statusResponse.status}), attempt ${attempt}`);
        continue;
      }

      const raw = await statusResponse.json();
      const statusData = raw.data || raw;
      console.log(`📊 Poll ${attempt}: Job ${jobId} status:`, statusData.status);

      // Update progress if available
      if (statusData.progress !== undefined) {
        await supabaseClient
          .from('video_generations')
          .update({ progress: Math.round(statusData.progress * 100) })
          .eq('id', generationId);
      }

      // Check if completed
      if (statusData.status === 'succeeded' || statusData.status === 'completed') {
        const videoUrl = statusData.outputs?.[0] || statusData.video_url || statusData.result_url || statusData.output_url;
        const thumbnailUrl = statusData.thumbnail_url;

        if (!videoUrl) {
          throw new Error('Wavespeed job completed but no video URL provided');
        }

        console.log('✅ Wavespeed generation completed:', videoUrl);

        // Update Salesforce if media_url_key exists
        const { data: generationRecord } = await supabaseClient
          .from('video_generations')
          .select('media_url_key, generation_data')
          .eq('id', generationId)
          .single();

        if (generationRecord?.media_url_key) {
          try {
            console.log(`🔄 Updating Salesforce for Media URL Key: ${generationRecord.media_url_key}`);
            const genData = generationRecord.generation_data || {};
            await updateSalesforceContent(generationRecord.media_url_key, videoUrl, 'Wavespeed AI', genData.model);
            console.log(`✅ Salesforce content updated successfully`);
          } catch (salesforceError) {
            console.error(`❌ Failed to update Salesforce content:`, salesforceError);
          }
        }

        // Mark as completed
        await supabaseClient
          .from('video_generations')
          .update({
            status: 'completed',
            progress: 100,
            video_url: videoUrl,
            error_message: null,
          })
          .eq('id', generationId);

        console.log(`✅ Wavespeed generation ${generationId} completed successfully`);
        return;

      } else if (statusData.status === 'failed' || statusData.status === 'error') {
        throw new Error(`Wavespeed job failed: ${statusData.error || 'Unknown error'}`);
      }

    } catch (error) {
      console.error(`❌ Error polling Wavespeed status (attempt ${attempt}):`, error);
      if (attempt >= maxAttempts) {
        throw error;
      }
    }
  }

  throw new Error('Wavespeed generation timed out');
}

// Update Salesforce content and assign to default playlist
async function updateSalesforceContent(mediaUrlKey: string, videoUrl: string, modelVendor?: string, modelUsed?: string) {
  console.log(`🔄 Updating Salesforce for Media URL Key: ${mediaUrlKey}`);
  console.log(`📝 Updating Salesforce - Media Key: ${mediaUrlKey}, Video URL: ${videoUrl}`);
  
  try {
    // Update the main content record
    const formData = new FormData();
    formData.append('sObj', 'ri1__Content__c');
    formData.append('string_ri1__AI_Gen_Key__c', mediaUrlKey);
    formData.append('string_ri1__URL__c', videoUrl);
    formData.append('string_ri1__Generation_Status__c', 'COMPLETED');
    formData.append('number_ri1__Generation_Progress__c', '100');
    
    // Add model vendor and model used
    if (modelVendor) {
      formData.append('string_ri1__AI_Models_Vendors__c', modelVendor);
    }
    if (modelUsed) {
      formData.append('string_ri1__AI_Model_Used__c', modelUsed);
    }
    
    console.log(`📤 Sending to Salesforce endpoint with payload:`, {
      sObj: 'ri1__Content__c',
      mediaUrlKey,
      videoUrl,
      status: 'COMPLETED',
      progress: '100',
      modelVendor,
      modelUsed,
    });
    
    // Submit to Salesforce via web2case endpoint
    const response = await fetch('https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php', {
      method: 'POST',
      body: formData,
    });
    
    console.log(`📥 Salesforce response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const responseText = await response.text();
      console.log('✅ Successfully updated Salesforce with video URL');
      console.log(`📄 Salesforce response body:`, responseText);
      
      // Try to assign to default playlist if not already assigned
      try {
        const playlistFormData = new FormData();
        playlistFormData.append('sObj', 'ri1__Content_to_Playlist__c');
        playlistFormData.append('string_ri1__AI_Gen_Key__c', mediaUrlKey);
        playlistFormData.append('string_ri1__Playlist__c', 'a2H5e000002JD7g'); // Default playlist ID
        playlistFormData.append('number_ri1__Playlist_Order__c', '999'); // Add at end
        
        const playlistResponse = await fetch('https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php', {
          method: 'POST',
          body: playlistFormData,
        });
        
        if (playlistResponse.ok) {
          console.log('✅ Successfully assigned video to default playlist');
        } else {
          console.log('ℹ️ Could not assign to playlist (may already be assigned):', playlistResponse.status);
        }
      } catch (playlistError) {
        console.log('ℹ️ Playlist assignment failed (may already exist):', playlistError);
      }
      
    } else {
      const errorText = await response.text();
      console.error('❌ Failed to update Salesforce:', response.status, response.statusText);
      console.error('❌ Salesforce error response:', errorText);
    }
  } catch (error) {
    console.error('❌ Salesforce update error:', error);
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('❌ Network error - check Salesforce endpoint accessibility');
    }
  }
}
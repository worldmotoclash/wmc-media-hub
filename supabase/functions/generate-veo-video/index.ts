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
    const generationData = {
      prompt: requestData.prompt,
      negativePrompt: requestData.negativePrompt,
      duration: requestData.duration || 5,
      aspectRatio: requestData.aspectRatio || '16:9',
      creativity: requestData.creativity || 0.5,
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

    // Start background mock generation process
    EdgeRuntime.waitUntil(mockGenerationProcess(videoGeneration.id, mockOperationName));

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

// Mock generation process that simulates video generation
async function mockGenerationProcess(generationId: string, operationName: string) {
  console.log(`Starting mock generation process for ${generationId}`);
  
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    // Simulate generation progress over 30 seconds
    const totalSteps = 6;
    
    for (let step = 1; step <= totalSteps; step++) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const progress = Math.round((step / totalSteps) * 100);
      
      console.log(`Mock generation ${generationId} progress: ${progress}%`);
      
      if (step === totalSteps) {
        // Simulation complete - mark as completed with a mock video URL
        const mockVideoUrl = `https://storage.googleapis.com/generated-videos/mock-video-${generationId}.mp4`;
        
        await supabaseClient
          .from('video_generations')
          .update({
            status: 'completed',
            progress: 100,
            video_url: mockVideoUrl,
          })
          .eq('id', generationId);
        
        console.log(`Mock generation ${generationId} completed successfully`);
        
        // Note: Salesforce submission is handled client-side via iframe method
        console.log(`✅ Video generation completed. Client should handle Salesforce update.`);
        
      } else {
        // Update progress
        await supabaseClient
          .from('video_generations')
          .update({
            progress: progress,
          })
          .eq('id', generationId);
      }
    }
    
  } catch (error) {
    console.error(`Error in mock generation process for ${generationId}:`, error);
    
    // Mark as failed
    await supabaseClient
      .from('video_generations')
      .update({
        status: 'failed',
        error_message: `Mock generation error: ${error.message}`,
      })
      .eq('id', generationId);
  }
}

// Note: All Salesforce operations are now handled client-side using iframe method
// This ensures proper form submission with sObj=ri1__Content__c and avoids server-side CORS issues
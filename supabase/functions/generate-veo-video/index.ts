import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VeoGenerationRequest {
  userId: string;
  prompt: string;
  negativePrompt?: string;
  duration?: number;
  aspectRatio?: string;
  creativity?: number;
  salesforceData?: {
    title: string;
    subtitle?: string;
    description?: string;
    categories?: string[];
    template?: string;
    location?: string;
    track?: string;
    scheduledDate?: string;
    tags?: string[];
    keywords?: string[];
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: VeoGenerationRequest = await req.json();
    
    // Validate user ID is provided
    if (!requestData.userId) {
      throw new Error('User ID is required');
    }

    console.log('Video generation request from user:', requestData.userId);
    console.log('Prompt:', requestData.prompt.substring(0, 100) + '...');

    // Initialize Supabase client with service role for database operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get Google VEO credentials
    const googleApiKey = Deno.env.get('GOOGLE_VEO_API_KEY');
    const googleProjectId = Deno.env.get('GOOGLE_VEO_PROJECT_ID');
    
    if (!googleApiKey || !googleProjectId) {
      console.error('Missing Google VEO credentials');
      throw new Error('Google VEO credentials not configured');
    }

    // Create video generation record
    const generationData = {
      prompt: requestData.prompt,
      negativePrompt: requestData.negativePrompt,
      duration: requestData.duration || 5,
      aspectRatio: requestData.aspectRatio || '16:9',
      creativity: requestData.creativity || 0.5,
      salesforceData: requestData.salesforceData,
    };

    console.log('Creating video generation record...');
    
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

    console.log('Created video generation record:', videoGeneration.id);

    // For now, create a mock implementation that simulates video generation
    // This allows us to test the authentication and database flow
    const mockOperationName = `projects/${googleProjectId}/operations/mock-${videoGeneration.id}`;
    
    console.log('Starting mock video generation...');

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

    // Start background mock generation process
    EdgeRuntime.waitUntil(mockGenerationProcess(videoGeneration.id, mockOperationName));

    return new Response(JSON.stringify({
      success: true,
      generationId: videoGeneration.id,
      operationId: mockOperationName,
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
        
        // Trigger Salesforce sync in background
        EdgeRuntime.waitUntil(syncToSalesforce(generationId));
        
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

// Background function to sync to Salesforce
async function syncToSalesforce(generationId: string) {
  console.log(`Starting Salesforce sync for generation ${generationId}`);
  
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    // Get generation data
    const { data: generation, error } = await supabaseClient
      .from('video_generations')
      .select('*')
      .eq('id', generationId)
      .single();

    if (error || !generation) {
      console.error('Error fetching generation data:', error);
      return;
    }

    const generationData = generation.generation_data;
    const salesforceData = generationData.salesforceData || {};

    // Prepare Salesforce record data
    const salesforceRecord = {
      Name: salesforceData.title || `AI Generated Video - ${new Date().toISOString()}`,
      ri1__Subtitle__c: salesforceData.subtitle,
      ri1__Description__c: salesforceData.description,
      ri1__URL__c: generation.video_url,
      ri1__Length_in_Seconds__c: generationData.duration,
      ri1__Aspect_Ratio__c: generationData.aspectRatio,
      AI_Prompt__c: generationData.prompt,
      AI_Negative_Prompt__c: generationData.negativePrompt,
      AI_Creativity_Level__c: generationData.creativity,
      Generation_Status__c: generation.status.toUpperCase(),
      Generation_Progress__c: generation.progress,
      API_Operation_ID__c: generation.google_operation_id,
      ri1__Categories__c: salesforceData.categories?.join(';'),
      ri1__Template__c: salesforceData.template,
      ri1__Location__c: salesforceData.location,
      ri1__Track__c: salesforceData.track,
      ri1__Scheduled_Date__c: salesforceData.scheduledDate,
      ri1__Tags__c: salesforceData.tags?.join(';'),
      ri1__Keywords__c: salesforceData.keywords?.join(';'),
      // Set default values for required fields
      ri1__Type__c: 'AI Generated',
      ri1__Status__c: 'Generated',
    };

    // For now, we'll just log the data that would be sent to Salesforce
    console.log('Salesforce record to sync:', salesforceRecord);

    console.log(`Salesforce sync completed for generation ${generationId}`);

  } catch (error) {
    console.error(`Error syncing to Salesforce for generation ${generationId}:`, error);
  }
}
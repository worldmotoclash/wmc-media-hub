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

    // Initialize Supabase client with service role for database operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Get Google VEO credentials
    const googleApiKey = Deno.env.get('GOOGLE_VEO_API_KEY');
    const googleProjectId = Deno.env.get('GOOGLE_VEO_PROJECT_ID');
    
    if (!googleApiKey || !googleProjectId) {
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

    // Prepare Google VEO API request
    const veoRequestBody = {
      prompt: requestData.prompt,
      ...(requestData.negativePrompt && { negativePrompt: requestData.negativePrompt }),
      duration: requestData.duration || 5,
      aspectRatio: requestData.aspectRatio || '16:9',
      creativity: requestData.creativity || 0.5,
    };

    // Call Google VEO API
    const veoResponse = await fetch(
      `https://aiplatform.googleapis.com/v1/projects/${googleProjectId}/locations/us-central1/publishers/google/models/veo-001:generateVideo`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${googleApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(veoRequestBody),
      }
    );

    if (!veoResponse.ok) {
      const errorText = await veoResponse.text();
      console.error('Google VEO API error:', errorText);
      
      // Update generation record with error
      await supabaseClient
        .from('video_generations')
        .update({
          status: 'failed',
          error_message: `Google VEO API error: ${errorText}`,
        })
        .eq('id', videoGeneration.id);

      throw new Error(`Google VEO API error: ${veoResponse.status}`);
    }

    const veoData = await veoResponse.json();
    const operationName = veoData.name;

    console.log('Google VEO operation started:', operationName);

    // Update generation record with operation ID and status
    const { error: updateError } = await supabaseClient
      .from('video_generations')
      .update({
        google_operation_id: operationName,
        status: 'generating',
      })
      .eq('id', videoGeneration.id);

    if (updateError) {
      console.error('Error updating video generation:', updateError);
    }

    // Start background polling for status updates
    EdgeRuntime.waitUntil(pollGenerationStatus(videoGeneration.id, operationName));

    return new Response(JSON.stringify({
      success: true,
      generationId: videoGeneration.id,
      operationId: operationName,
      message: 'Video generation started successfully',
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

// Background function to poll generation status
async function pollGenerationStatus(generationId: string, operationName: string) {
  console.log(`Starting polling for generation ${generationId}`);
  
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const googleApiKey = Deno.env.get('GOOGLE_VEO_API_KEY');
  const maxAttempts = 60; // 5 minutes with 5-second intervals
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      attempts++;

      // Check status with Google VEO API
      const statusResponse = await fetch(
        `https://aiplatform.googleapis.com/v1/${operationName}`,
        {
          headers: {
            'Authorization': `Bearer ${googleApiKey}`,
          },
        }
      );

      if (!statusResponse.ok) {
        console.error(`Error checking status: ${statusResponse.status}`);
        continue;
      }

      const statusData = await statusResponse.json();
      console.log(`Generation ${generationId} status:`, statusData);

      if (statusData.done) {
        if (statusData.error) {
          // Generation failed
          await supabaseClient
            .from('video_generations')
            .update({
              status: 'failed',
              error_message: JSON.stringify(statusData.error),
              progress: 0,
            })
            .eq('id', generationId);
          
          console.log(`Generation ${generationId} failed:`, statusData.error);
          break;
        } else if (statusData.response && statusData.response.video) {
          // Generation completed successfully
          const videoUri = statusData.response.video.uri;
          
          await supabaseClient
            .from('video_generations')
            .update({
              status: 'completed',
              progress: 100,
              video_url: videoUri,
            })
            .eq('id', generationId);

          console.log(`Generation ${generationId} completed: ${videoUri}`);
          
          // Trigger Salesforce sync in background
          EdgeRuntime.waitUntil(syncToSalesforce(generationId));
          break;
        }
      } else {
        // Still generating, update progress
        const progress = Math.min(90, Math.floor((attempts / maxAttempts) * 90));
        
        await supabaseClient
          .from('video_generations')
          .update({ progress })
          .eq('id', generationId);
      }
    } catch (error) {
      console.error(`Error polling generation ${generationId}:`, error);
    }
  }

  // If we've exhausted all attempts and it's still not done
  if (attempts >= maxAttempts) {
    await supabaseClient
      .from('video_generations')
      .update({
        status: 'failed',
        error_message: 'Generation timed out after 5 minutes',
      })
      .eq('id', generationId);
    
    console.log(`Generation ${generationId} timed out`);
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

    // Call w2x-engine API (you'll need to replace this URL with the actual endpoint)
    // const w2xResponse = await fetch('YOUR_W2X_ENGINE_ENDPOINT', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     // Add any required authentication headers
    //   },
    //   body: JSON.stringify({
    //     sobjectType: 'ri1__Content__c',
    //     record: salesforceRecord,
    //   }),
    // });

    // For now, we'll just log the data that would be sent
    console.log('Salesforce record to sync:', salesforceRecord);

    // Update generation record with Salesforce record ID
    // const salesforceResult = await w2xResponse.json();
    // await supabaseClient
    //   .from('video_generations')
    //   .update({
    //     salesforce_record_id: salesforceResult.id,
    //   })
    //   .eq('id', generationId);

    console.log(`Salesforce sync completed for generation ${generationId}`);

  } catch (error) {
    console.error(`Error syncing to Salesforce for generation ${generationId}:`, error);
  }
}
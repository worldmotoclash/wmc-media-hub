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

    console.log('Salesforce record to sync:', salesforceRecord);

    // Submit to Salesforce using w2x-engine.php
    const salesforceRecordId = await submitToSalesforce(salesforceRecord);
    
    if (salesforceRecordId) {
      // Update generation record with Salesforce record ID
      await supabaseClient
        .from('video_generations')
        .update({
          salesforce_record_id: salesforceRecordId,
        })
        .eq('id', generationId);
      
      console.log(`Salesforce sync completed for generation ${generationId}, record ID: ${salesforceRecordId}`);
    } else {
      console.error(`Failed to sync generation ${generationId} to Salesforce`);
    }

  } catch (error) {
    console.error(`Error syncing to Salesforce for generation ${generationId}:`, error);
  }
}

// Function to submit data to Salesforce using direct HTTP POST
async function submitToSalesforce(recordData: Record<string, any>): Promise<string | null> {
  try {
    console.log('🔄 Starting Salesforce w2x-engine submission...');
    
    // Prepare form data
    const formData = new FormData();
    
    // Add sObj field for ri1__Content__c
    formData.append('sObj', 'ri1__Content__c');
    console.log('📝 Added sObj: ri1__Content__c');

    // Map record data to form fields
    const formFields: Record<string, string> = {};
    Object.entries(recordData).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        // Determine field prefix based on data type
        let fieldName: string;
        if (typeof value === 'number') {
          fieldName = `number_${key}`;
        } else if (key.includes('Date')) {
          fieldName = `date_${key}`;
        } else {
          fieldName = `text_${key}`;
        }
        
        formData.append(fieldName, value.toString());
        formFields[fieldName] = value.toString();
        console.log(`📝 Added form field: ${fieldName} = ${value}`);
      }
    });

    // Create debug URL for manual testing
    const debugUrl = createDebugUrl(formFields);
    console.log('🔗 Debug URL (copy to browser to test manually):');
    console.log(debugUrl);

    // Log full request details
    console.log('🚀 Submitting to: https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php');
    console.log('📊 Total form fields:', Object.keys(formFields).length + 1); // +1 for sObj

    // Submit to Salesforce
    const response = await fetch('https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php', {
      method: 'POST',
      body: formData,
      headers: {
        'User-Agent': 'Supabase Edge Function'
      }
    });

    console.log('📈 Salesforce response status:', response.status);
    console.log('📋 Response headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
    
    if (response.ok) {
      const responseText = await response.text();
      console.log('✅ Salesforce response (first 500 chars):', responseText.substring(0, 500));
      console.log('📝 Full response length:', responseText.length);
      
      // Try to extract record ID from response
      const recordId = extractRecordIdFromResponse(responseText);
      console.log('🎯 Extracted record ID:', recordId || 'No ID found');
      return recordId || 'SUCCESS';
    } else {
      const errorText = await response.text();
      console.error('❌ Salesforce submission failed with status:', response.status);
      console.error('❌ Error response:', errorText);
      return null;
    }

  } catch (error) {
    console.error('💥 Error in submitToSalesforce:', error);
    return null;
  }
}

// Helper function to create a debug URL for manual testing
function createDebugUrl(formFields: Record<string, string>): string {
  const baseUrl = 'https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php';
  const params = new URLSearchParams();
  
  // Add sObj
  params.append('sObj', 'ri1__Content__c');
  
  // Add all form fields
  Object.entries(formFields).forEach(([key, value]) => {
    params.append(key, value);
  });
  
  return `${baseUrl}?${params.toString()}`;
}

// Helper function to extract record ID from response text
function extractRecordIdFromResponse(responseText: string): string | null {
  try {
    // Look for common patterns in Salesforce response that indicate record ID
    // The w2x-engine.php might return the record ID in various formats
    const idPattern = /id[=:]?\s*([a-zA-Z0-9]{15,18})/i;
    const match = responseText.match(idPattern);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error extracting record ID from response:', error);
    return null;
  }
}

// Helper function to extract record ID from URL
function extractRecordIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const id = urlObj.searchParams.get('id');
    return id;
  } catch (error) {
    console.error('Error extracting record ID from URL:', error);
    return null;
  }
}
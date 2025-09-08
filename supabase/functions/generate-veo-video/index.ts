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

    // Step 1: Submit to Salesforce FIRST (before video generation)
    console.log('🚀 Step 1: Submitting to Salesforce first...');
    
    const salesforceData = requestData.salesforceData || {};
    const generationData = {
      prompt: requestData.prompt,
      negativePrompt: requestData.negativePrompt,
      duration: requestData.duration || 5,
      aspectRatio: requestData.aspectRatio || '16:9',
      creativity: requestData.creativity || 0.5,
      salesforceData: salesforceData,
    };

    // Prepare Salesforce record data for initial submission
    const salesforceRecord = {
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
      API_Operation_ID__c: '', // Will be updated after generation starts
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

    // Submit to Salesforce first
    const { recordId: salesforceRecordId, debugUrl } = await submitToSalesforce(salesforceRecord);
    
    if (!salesforceRecordId) {
      console.error('❌ Salesforce submission failed - aborting video generation');
      throw new Error('Failed to create Salesforce record');
    }

    console.log('✅ Step 2: Salesforce record created:', salesforceRecordId);

    // Step 2: Create video generation record with Salesforce ID
    console.log('📝 Step 3: Creating video generation record in Supabase...');
    
    const { data: videoGeneration, error: insertError } = await supabaseClient
      .from('video_generations')
      .insert({
        user_id: requestData.userId,
        status: 'pending',
        generation_data: generationData,
        salesforce_record_id: salesforceRecordId, // Store Salesforce ID immediately
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting video generation:', insertError);
      throw new Error('Failed to create video generation record');
    }

    console.log('✅ Step 4: Video generation record created:', videoGeneration.id);

    // Step 3: Start video generation process
    const mockOperationName = `projects/${googleProjectId}/operations/mock-${videoGeneration.id}`;
    
    console.log('🎬 Step 5: Starting video generation...');

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
      salesforceRecordId: salesforceRecordId,
      salesforceDebugUrl: debugUrl,
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
        
        // Update existing Salesforce record with video URL
        EdgeRuntime.waitUntil(updateSalesforceRecord(generationId, mockVideoUrl));
        
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

// Background function to update existing Salesforce record with video URL
async function updateSalesforceRecord(generationId: string, videoUrl: string) {
  console.log(`🔄 Updating Salesforce record for generation ${generationId} with video URL`);
  
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

    if (!generation.salesforce_record_id) {
      console.error('No Salesforce record ID found for generation:', generationId);
      return;
    }

    console.log(`📝 Updating Salesforce record ${generation.salesforce_record_id} with video URL: ${videoUrl}`);

    const generationData = generation.generation_data;

    // Prepare update data for the existing Salesforce record
    const updateData = {
      ri1__URL__c: videoUrl,
      Generation_Status__c: 'COMPLETED',
      Generation_Progress__c: 100,
      API_Operation_ID__c: generation.google_operation_id,
      ri1__Status__c: 'Generated'
    };

    console.log('Salesforce update data:', updateData);

    // TODO: Here we would update the existing Salesforce record
    // For now, we'll just log that we would update it
    // In a real implementation, you might use Salesforce REST API or another update method
    console.log(`✅ Would update Salesforce record ${generation.salesforce_record_id} with completion data`);

  } catch (error) {
    console.error(`Error updating Salesforce record for generation ${generationId}:`, error);
  }
}

// Function to submit data to Salesforce using direct HTTP POST
async function submitToSalesforce(recordData: Record<string, any>): Promise<{recordId: string | null, debugUrl: string}> {
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
    console.log('🔗 Debug URL (will be opened in browser):');
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
      return { recordId: recordId || 'SUCCESS', debugUrl };
    } else {
      const errorText = await response.text();
      console.error('❌ Salesforce submission failed with status:', response.status);
      console.error('❌ Error response:', errorText);
      return { recordId: null, debugUrl };
    }

  } catch (error) {
    console.error('💥 Error in submitToSalesforce:', error);
    return { recordId: null, debugUrl: '' };
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
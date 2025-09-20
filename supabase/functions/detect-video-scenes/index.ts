import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

interface SceneDetection {
  timestamp: number;
  frame: number;
  confidence: number;
  thumbnail?: string;
}

interface DetectionResult {
  scenes: SceneDetection[];
  totalScenes: number;
  videoDuration: number;
  metadata: {
    filename: string;
    resolution: string;
    fps: number;
  };
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to store pre-processed scene detection results
async function storeSceneDetectionResults(
  jobId: string, 
  results: DetectionResult
): Promise<void> {
  console.log(`Storing scene detection results for job ${jobId}`);
  
  try {
    const { error } = await supabase
      .from('video_scene_detections')
      .update({
        processing_status: 'completed',
        total_scenes: results.totalScenes,
        video_duration: results.videoDuration,
        results: results,
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);

    if (error) {
      throw error;
    }

    console.log(`Successfully stored results for job ${jobId}`);
  } catch (error) {
    console.error(`Failed to store results for job ${jobId}:`, error);
    
    // Update job status to failed
    await supabase
      .from('video_scene_detections')
      .update({
        processing_status: 'failed',
        error_message: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    throw error;
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData = await req.json();
    console.log("Received scene detection storage request", {
      jobId: requestData.jobId,
      hasResults: !!requestData.results,
      totalScenes: requestData.results?.totalScenes
    });

    const { jobId, results } = requestData;

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Job ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!results) {
      return new Response(
        JSON.stringify({ error: 'Scene detection results are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Store the pre-processed results
    await storeSceneDetectionResults(jobId, results);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Results stored successfully',
        jobId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Scene detection storage error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
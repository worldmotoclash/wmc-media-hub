import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateJobRequest {
  mediaAssetId?: string;
  threshold: number;
  filename?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Creating scene detection job...');
    
    const { mediaAssetId, threshold, filename }: CreateJobRequest = await req.json();
    
    // Create Supabase client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Prepare the insert data
    const insertData: any = {
      threshold,
      processing_status: 'pending',
      total_scenes: 0
    };

    if (mediaAssetId) {
      insertData.media_asset_id = mediaAssetId;
    }

    // For upload jobs, store the filename in metadata
    if (filename && !mediaAssetId) {
      insertData.results = { filename };
    }

    console.log('Inserting job with data:', insertData);

    // Insert the scene detection job using service role
    const { data: job, error } = await supabase
      .from('video_scene_detections')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Scene detection job created:', job.id);

    return new Response(JSON.stringify({ jobId: job.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in create-scene-detection-job function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create scene detection job',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
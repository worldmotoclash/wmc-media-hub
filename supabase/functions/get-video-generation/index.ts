import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GetGenerationRequest {
  id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { id }: GetGenerationRequest = await req.json();

    if (!id) {
      throw new Error('Generation ID is required');
    }

    // Initialize Supabase client with service role key (bypasses RLS)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log(`📊 Fetching generation status for ID: ${id}`);

    // Get generation record using service key (bypasses RLS)
    const { data: generation, error } = await supabaseClient
      .from('video_generations')
      .select('id, status, progress, video_url, error_message, updated_at, generation_data, provider')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Database error:', error);
      throw new Error('Failed to fetch generation status');
    }

    if (!generation) {
      return new Response(JSON.stringify({
        error: 'Generation not found',
        success: false,
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return sanitized status info
    const response = {
      success: true,
      id: generation.id,
      status: generation.status,
      progress: generation.progress,
      video_url: generation.video_url,
      error_message: generation.error_message,
      updated_at: generation.updated_at,
      provider: generation.provider || 'veo',
      model: generation.generation_data?.model || 'unknown',
    };

    console.log(`✅ Status for ${id}: ${generation.status} (${generation.progress}%)`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-video-generation function:', error);
    return new Response(JSON.stringify({
      error: error.message,
      success: false,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
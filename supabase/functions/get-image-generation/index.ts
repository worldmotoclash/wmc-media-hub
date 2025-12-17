import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GetGenerationRequest {
  id: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { id }: GetGenerationRequest = await req.json();

    if (!id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Generation ID is required'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client with service role for reading
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch the generation record
    const { data: generation, error } = await supabase
      .from('image_generations')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !generation) {
      console.error('Error fetching generation:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Generation not found'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      id: generation.id,
      status: generation.status,
      progress: generation.progress,
      image_url: generation.image_url,
      error_message: generation.error_message,
      prompt: generation.prompt,
      template: generation.template,
      created_at: generation.created_at,
      updated_at: generation.updated_at
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in get-image-generation function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

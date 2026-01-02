import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CancelRequest {
  id: string;
  type: 'video' | 'image';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { id, type }: CancelRequest = await req.json();

    if (!id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Generation ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!type || !['video', 'image'].includes(type)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Type must be "video" or "image"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Cancelling ${type} generation: ${id}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const tableName = type === 'video' ? 'video_generations' : 'image_generations';

    // Update the generation status to cancelled
    const { data, error } = await supabase
      .from(tableName)
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString(),
        error_message: 'Cancelled by user'
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data) {
      return new Response(
        JSON.stringify({ success: false, error: 'Generation not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully cancelled ${type} generation: ${id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${type.charAt(0).toUpperCase() + type.slice(1)} generation cancelled`,
        id: data.id,
        status: data.status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Cancel generation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

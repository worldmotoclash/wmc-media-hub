import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete orphaned "My Image" records that reference non-existent folder
    const { data, error } = await supabase
      .from("media_assets")
      .delete()
      .like("title", "My Image%")
      .like("source_id", "%WMC SIZZLES UNUSED%")
      .select("id");

    if (error) {
      throw error;
    }

    const deletedCount = data?.length || 0;

    console.log(`Deleted ${deletedCount} orphaned "My Image" records`);

    return new Response(
      JSON.stringify({
        success: true,
        deletedCount,
        message: `Successfully deleted ${deletedCount} orphaned records`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error cleaning up orphaned assets:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

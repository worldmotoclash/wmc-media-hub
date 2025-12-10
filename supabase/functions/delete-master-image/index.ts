import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// S3 Configuration
const WASABI_ACCESS_KEY = Deno.env.get("WASABI_ACCESS_KEY_ID") || "";
const WASABI_SECRET_KEY = Deno.env.get("WASABI_SECRET_ACCESS_KEY") || "";
const WASABI_REGION = "us-central-1";
const WASABI_BUCKET = "shortf-media";
const WASABI_ENDPOINT = `https://s3.${WASABI_REGION}.wasabisys.com`;
const S3_PREFIX = "SOCAIL_MEDIA_IMAGES_KNEWTV/masters";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { masterAssetId } = await req.json();

    if (!masterAssetId) {
      return new Response(
        JSON.stringify({ error: "masterAssetId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Deleting master image and variants for: ${masterAssetId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize AWS client for Wasabi S3
    const aws = new AwsClient({
      accessKeyId: WASABI_ACCESS_KEY,
      secretAccessKey: WASABI_SECRET_KEY,
      region: WASABI_REGION,
      service: "s3",
    });

    // 1. Fetch all variants from media_assets where master_id matches
    const { data: variants, error: variantsError } = await supabase
      .from("media_assets")
      .select("id, s3_key, title")
      .eq("master_id", masterAssetId);

    if (variantsError) {
      console.error("Error fetching variants:", variantsError);
    }

    console.log(`Found ${variants?.length || 0} variants to delete`);

    // 2. Delete S3 objects for the entire master folder
    const masterPrefix = `${S3_PREFIX}/${masterAssetId}/`;
    console.log(`Listing objects with prefix: ${masterPrefix}`);

    // List all objects in the master folder
    const listUrl = `${WASABI_ENDPOINT}/${WASABI_BUCKET}?list-type=2&prefix=${encodeURIComponent(masterPrefix)}`;
    const listResponse = await aws.fetch(listUrl, { method: "GET" });

    if (listResponse.ok) {
      const listXml = await listResponse.text();
      // Parse the XML to get object keys
      const keyMatches = listXml.matchAll(/<Key>([^<]+)<\/Key>/g);
      const keysToDelete: string[] = [];

      for (const match of keyMatches) {
        keysToDelete.push(match[1]);
      }

      console.log(`Found ${keysToDelete.length} S3 objects to delete`);

      // Delete each object
      for (const key of keysToDelete) {
        const deleteUrl = `${WASABI_ENDPOINT}/${WASABI_BUCKET}/${encodeURIComponent(key)}`;
        console.log(`Deleting S3 object: ${key}`);
        
        try {
          const deleteResponse = await aws.fetch(deleteUrl, { method: "DELETE" });
          if (!deleteResponse.ok) {
            console.error(`Failed to delete S3 object ${key}: ${deleteResponse.status}`);
          }
        } catch (s3Error) {
          console.error(`S3 delete error for ${key}:`, s3Error);
        }
      }
    } else {
      console.error(`Failed to list S3 objects: ${listResponse.status}`);
    }

    // 3. Delete variant records from media_assets
    if (variants && variants.length > 0) {
      const { error: deleteVariantsError } = await supabase
        .from("media_assets")
        .delete()
        .eq("master_id", masterAssetId);

      if (deleteVariantsError) {
        console.error("Error deleting variant records:", deleteVariantsError);
      } else {
        console.log(`Deleted ${variants.length} variant records from media_assets`);
      }
    }

    // 4. Delete social_kit_jobs records for this master
    const { data: jobs, error: jobsError } = await supabase
      .from("social_kit_jobs")
      .delete()
      .eq("master_asset_id", masterAssetId)
      .select();

    if (jobsError) {
      console.error("Error deleting social kit jobs:", jobsError);
    } else {
      console.log(`Deleted ${jobs?.length || 0} social kit job records`);
    }

    // 5. Check if master is in media_assets and delete it
    const { data: masterAsset, error: masterError } = await supabase
      .from("media_assets")
      .delete()
      .eq("id", masterAssetId)
      .select();

    if (masterError) {
      console.error("Error deleting master record:", masterError);
    } else if (masterAsset && masterAsset.length > 0) {
      console.log(`Deleted master record from media_assets`);
    }

    console.log(`Successfully deleted master image ${masterAssetId} and all related data`);

    return new Response(
      JSON.stringify({
        success: true,
        deleted: {
          variantsCount: variants?.length || 0,
          jobsCount: jobs?.length || 0,
          masterDeleted: !!(masterAsset && masterAsset.length > 0)
        }
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in delete-master-image:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to delete master image" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
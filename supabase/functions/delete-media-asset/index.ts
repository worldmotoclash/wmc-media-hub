import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";
import { getS3Config } from '../_shared/s3Config.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const W2X_ENGINE_URL = "https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assetId, s3Key, salesforceId } = await req.json();

    if (!assetId) {
      return new Response(
        JSON.stringify({ error: "assetId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Deleting media asset: ${assetId}, s3Key: ${s3Key || 'none'}, salesforceId: ${salesforceId || 'none'}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let s3Deleted = false;
    let sfdcDeleted = false;

    // 1. Delete from S3/Wasabi
    if (s3Key) {
      try {
        const s3Config = getS3Config();
        const aws = new AwsClient({
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey,
          region: s3Config.region,
          service: "s3",
        });

        const deleteUrl = `${s3Config.endpoint}/${s3Config.bucketName}/${encodeURIComponent(s3Key)}`;
        console.log(`Deleting S3 object: ${s3Key}`);

        const deleteResponse = await aws.fetch(deleteUrl, { method: "DELETE" });
        if (deleteResponse.ok || deleteResponse.status === 204) {
          s3Deleted = true;
          console.log(`S3 object deleted: ${s3Key}`);
        } else {
          console.error(`Failed to delete S3 object: ${deleteResponse.status}`);
        }
      } catch (s3Error) {
        console.error("S3 delete error:", s3Error);
      }
    }

    // 2. Delete from Salesforce via w2x-engine
    if (salesforceId) {
      try {
        const formData = new URLSearchParams();
        formData.append("retURL", "https://worldmotoclash.com");
        formData.append("sObj", "ri1__Content__c");
        formData.append("action", "delete");
        formData.append("Id", salesforceId);

        console.log(`Deleting Salesforce record: ${salesforceId}`);

        const sfResponse = await fetch(W2X_ENGINE_URL, {
          method: "POST",
          body: formData,
        });

        const sfResponseText = await sfResponse.text();
        console.log(`w2x-engine delete response status: ${sfResponse.status}`);
        console.log(`w2x-engine delete response: ${sfResponseText.substring(0, 300)}`);

        if (sfResponse.ok) {
          sfdcDeleted = true;
          console.log(`Salesforce record deleted: ${salesforceId}`);
        } else {
          console.error(`w2x-engine delete failed: ${sfResponse.status}`);
        }
      } catch (sfdcError) {
        console.error("Salesforce delete error:", sfdcError);
      }
    }

    // 3. DB cleanup — tags first, then asset
    const { error: tagsError } = await supabase
      .from("media_asset_tags")
      .delete()
      .eq("media_asset_id", assetId);

    if (tagsError) {
      console.error("Error deleting asset tags:", tagsError);
    }

    const { error: assetError } = await supabase
      .from("media_assets")
      .delete()
      .eq("id", assetId);

    if (assetError) {
      console.error("Error deleting asset record:", assetError);
      throw assetError;
    }

    console.log(`Successfully deleted media asset ${assetId}`);

    return new Response(
      JSON.stringify({
        success: true,
        s3Deleted,
        sfdcDeleted,
        dbDeleted: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in delete-media-asset:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to delete media asset" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

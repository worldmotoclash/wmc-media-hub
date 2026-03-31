import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WMC_CONTENT_API = "https://api.realintelligence.com/api/wmc-content-master.py";
const ORG_ID = "00D5e000000HEcP";

// Helper to escape regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Extract match data from a content block
function extractFromBlock(block: string): { id: string; approvalStatus: string } | null {
  const idMatch = block.match(/<id>([^<]+)<\/id>/);
  if (!idMatch?.[1]) return null;

  const approvalMatch = block.match(/<approved>([^<]*)<\/approved>/);
  const approvalStatus = approvalMatch ? approvalMatch[1].trim() : 'Pending';
  return { id: idMatch[1].trim(), approvalStatus };
}

// Find a Salesforce match for a given URL/title in the XML content blocks
function findMatch(
  contentBlocks: string[],
  fileUrl: string,
  title?: string
): { id: string; approvalStatus: string } | null {
  const filename = fileUrl.split('/').pop()?.split('?')[0]?.toLowerCase() || '';

  // Strategy 1: Exact URL match (handles CDATA too since includes checks raw text)
  for (const block of contentBlocks) {
    if (block.includes(fileUrl)) {
      const result = extractFromBlock(block);
      if (result) return result;
    }
  }

  // Strategy 2: Filename match with CDATA-aware regex
  if (filename) {
    for (const block of contentBlocks) {
      const urlMatch = block.match(/<ri1__URL__c>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/ri1__URL__c>/) ||
                       block.match(/<url>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/url>/);
      if (urlMatch?.[1]) {
        const sfdcFilename = urlMatch[1].trim().split('/').pop()?.split('?')[0]?.toLowerCase() || '';
        if (sfdcFilename && sfdcFilename === filename) {
          const result = extractFromBlock(block);
          if (result) return result;
        }
      }
    }
  }

  // Strategy 3: Title match
  if (title) {
    const normalizedTitle = title.trim().toLowerCase();
    for (const block of contentBlocks) {
      const nameMatch = block.match(/<name>([^<]+)<\/name>/);
      if (nameMatch?.[1] && nameMatch[1].trim().toLowerCase() === normalizedTitle) {
        const result = extractFromBlock(block);
        if (result) return result;
      }
    }
  }

  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find all assets with pending_id status
    const { data: pendingAssets, error: fetchError } = await supabase
      .from("media_assets")
      .select("id, title, file_url, metadata")
      .is("salesforce_id", null)
      .not("file_url", "is", null);

    if (fetchError) {
      console.error("Error fetching pending assets:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch pending assets", details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter to only pending_id assets (jsonb filter in code since metadata is flexible)
    const assets = (pendingAssets || []).filter((a: any) => {
      const meta = a.metadata || {};
      return meta.sfdcSyncStatus === 'pending_id';
    });

    if (assets.length === 0) {
      console.log("No assets with pending_id status found.");
      return new Response(
        JSON.stringify({ success: true, message: "No pending assets to backfill", resolved: 0, total: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${assets.length} assets with pending_id status.`);

    // Fetch the XML feed once with cache busting
    const apiUrl = `${WMC_CONTENT_API}?orgId=${ORG_ID}&sandbox=False&_t=${Date.now()}`;
    console.log(`Fetching XML feed: ${apiUrl}`);
    const response = await fetch(apiUrl);
    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `XML feed request failed: ${response.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const xmlText = await response.text();
    console.log(`XML feed: ${xmlText.length} characters`);

    const contentBlocks = xmlText.match(/<content>[\s\S]*?<\/content>/g) || [];
    console.log(`Found ${contentBlocks.length} content blocks.`);

    let resolved = 0;
    let failed = 0;
    const results: Array<{ assetId: string; salesforceId?: string; status: string }> = [];

    for (const asset of assets) {
      const match = findMatch(contentBlocks, asset.file_url!, asset.title);

      if (match) {
        console.log(`Resolved ${asset.id} → SFDC ${match.id}`);
        const { error: updateError } = await supabase
          .from("media_assets")
          .update({
            salesforce_id: match.id,
            status: match.approvalStatus || 'Pending',
            metadata: {
              ...(asset.metadata || {}),
              sfdcSyncStatus: 'success',
              sfdcSyncedAt: new Date().toISOString(),
              sfdcApprovalStatus: match.approvalStatus,
            }
          })
          .eq("id", asset.id);

        if (updateError) {
          console.error(`Failed to update asset ${asset.id}:`, updateError);
          failed++;
          results.push({ assetId: asset.id, status: 'update_error' });
        } else {
          resolved++;
          results.push({ assetId: asset.id, salesforceId: match.id, status: 'resolved' });
        }
      } else {
        console.log(`No match found for ${asset.id} (${asset.title})`);
        failed++;
        results.push({ assetId: asset.id, status: 'no_match' });
      }
    }

    console.log(`Backfill complete: ${resolved} resolved, ${failed} unresolved out of ${assets.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Backfill complete: ${resolved} resolved, ${failed} unresolved`,
        resolved,
        failed,
        total: assets.length,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Backfill error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

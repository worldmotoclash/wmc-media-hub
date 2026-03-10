import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WMC_CONTENT_API = "https://api.realintelligence.com/api/wmc-content-master.py";
const W2X_ENGINE_URL = "https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php";
const ORG_ID = "00D5e000000HEcP";

// Governance constants - HARD RULES
// Sync establishes existence — not trust. Trust is established only after Librarian review.
const SYNC_APPROVAL_STATUS = "Pending";
const SYNC_SYSTEM_FLAG = "CREATED_BY_SYNC";

interface SyncRequest {
  assetId?: string;
  assetIds?: string[];
  creatorContactId?: string;
}

// Helper function to escape special regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Query the wmc-content-master API to find a Salesforce ID by matching URL
async function findSalesforceIdByUrl(cdnUrl: string, xmlCache?: string): Promise<string | null> {
  console.log(`Searching for Salesforce ID matching URL: ${cdnUrl}`);
  
  let xmlText = xmlCache;
  
  if (!xmlText) {
    try {
      const apiUrl = `${WMC_CONTENT_API}?orgId=${ORG_ID}&sandbox=False`;
      console.log(`Querying API: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error(`API request failed: ${response.status}`);
        return null;
      }
      
      xmlText = await response.text();
      console.log(`API response length: ${xmlText.length} characters`);
    } catch (error) {
      console.error("Error fetching API:", error);
      return null;
    }
  }
  
  // Find all content blocks and check URLs
  const contentBlocks = xmlText.match(/<content>[\s\S]*?<\/content>/g) || [];
  console.log(`Found ${contentBlocks.length} content blocks, searching for URL match...`);
  
  for (const block of contentBlocks) {
    // Check if this block contains our URL
    if (block.includes(cdnUrl)) {
      // Extract ID from this block
      const idMatch = block.match(/<id>([^<]+)<\/id>/);
      if (idMatch && idMatch[1]) {
        const salesforceId = idMatch[1].trim();
        console.log(`Found Salesforce ID: ${salesforceId}`);
        return salesforceId;
      }
    }
  }
  
  return null;
}

// Interface for SFDC sync metadata
interface SfdcSyncMetadata {
  prompt?: string;
  referenceImageUrl?: string;
  generationId?: string;
  description?: string;
  aspectRatio?: string;
  masterSalesforceId?: string;
  durationSeconds?: number;
  negativePrompt?: string;
  creativityLevel?: number;
  apiOperationId?: string;
  categories?: string[];
  location?: string;
  modelVendor?: string;
  modelUsed?: string;
  visualAnchors?: string[];
  extraConstraints?: string;
  negativeConstraints?: string[];
  creatorContactId?: string;
  contentIntent?: string;
}

// Create a new Salesforce Content record via w2x-engine with comprehensive fields
async function createSalesforceRecord(
  title: string, 
  cdnUrl: string, 
  contentType: string,
  metadata?: SfdcSyncMetadata
): Promise<boolean> {
  console.log(`Creating Salesforce record: ${title}`);
  
  try {
    const formData = new FormData();
    formData.append("retURL", "https://worldmotoclash.com");
    formData.append("sObj", "ri1__Content__c");
    formData.append("string_Name", title);
    formData.append("string_ri1__Content_Type__c", contentType);
    formData.append("string_ri1__URL__c", cdnUrl);
    
    // GOVERNANCE: Sync-created records are ALWAYS Pending (Librarian approval required)
    formData.append("string_ri1__Content_Approved__c", SYNC_APPROVAL_STATUS);
    
    // GOVERNANCE: Flag records created by automated sync for audit trails
    formData.append("string_ri1__Content_System_Flags__c", SYNC_SYSTEM_FLAG);
    
    // AI Generation Fields
    if (metadata?.prompt) {
      formData.append("string_ri1__AI_Prompt__c", metadata.prompt.substring(0, 32768));
    }
    if (metadata?.negativePrompt) {
      formData.append("string_ri1__AI_Negative_Prompt__c", metadata.negativePrompt.substring(0, 32768));
    }
    if (metadata?.referenceImageUrl) {
      formData.append("string_ri1__AI_Reference_Image__c", metadata.referenceImageUrl.substring(0, 255));
    }
    if (metadata?.generationId) {
      formData.append("string_ri1__AI_Gen_Key__c", metadata.generationId.substring(0, 255));
    }
    if (metadata?.description) {
      formData.append("string_ri1__Description__c", metadata.description.substring(0, 32768));
    }
    if (metadata?.aspectRatio) {
      formData.append("string_ri1__Aspect_Ratio__c", metadata.aspectRatio);
    }
    if (metadata?.masterSalesforceId) {
      formData.append("lookup_ri1__Master_Content__c", metadata.masterSalesforceId);
    }
    if (typeof metadata?.durationSeconds === 'number') {
      formData.append("number_ri1__Length_in_Seconds__c", metadata.durationSeconds.toString());
    }
    if (typeof metadata?.creativityLevel === 'number') {
      formData.append("number_ri1__AI_Creativity_Level__c", metadata.creativityLevel.toString());
    }
    if (metadata?.apiOperationId) {
      formData.append("string_ri1__API_Operation_ID__c", metadata.apiOperationId.substring(0, 255));
    }
    if (metadata?.categories && metadata.categories.length > 0) {
      formData.append("string_ri1__Categories__c", metadata.categories.join(";"));
    }
    if (metadata?.location) {
      formData.append("string_ri1__Location__c", metadata.location.substring(0, 255));
    }
    if (metadata?.modelVendor) {
      formData.append("string_ri1__AI_Models_Vendors__c", metadata.modelVendor.substring(0, 255));
    }
    if (metadata?.modelUsed) {
      formData.append("string_ri1__AI_Model_Used__c", metadata.modelUsed.substring(0, 255));
    }
    // New fields: Visual Anchors, Extra Constraints, Negative Constraints
    if (metadata?.visualAnchors && metadata.visualAnchors.length > 0) {
      formData.append("string_ri1__Visual_Anchors__c", metadata.visualAnchors.join(', ').substring(0, 32768));
    }
    if (metadata?.extraConstraints) {
      formData.append("string_ri1__Extra_Constraints__c", metadata.extraConstraints.substring(0, 32768));
    }
    if (metadata?.negativeConstraints && metadata.negativeConstraints.length > 0) {
      formData.append("string_ri1__Negative_Constraints__c", metadata.negativeConstraints.join(', ').substring(0, 32768));
    }
    // Creator Contact ID - link to the Contact who created this content
    if (metadata?.creatorContactId) {
      formData.append("lookup_ri1__Contact__c", metadata.creatorContactId);
      console.log(`Linking content to creator Contact: ${metadata.creatorContactId}`);
    }
    
    console.log("SFDC sync metadata fields:", {
      hasPrompt: !!metadata?.prompt,
      hasNegativePrompt: !!metadata?.negativePrompt,
      hasRefImage: !!metadata?.referenceImageUrl,
      hasGenId: !!metadata?.generationId,
      hasDuration: typeof metadata?.durationSeconds === 'number',
      hasCreativity: typeof metadata?.creativityLevel === 'number',
      hasModelVendor: !!metadata?.modelVendor,
      hasModelUsed: !!metadata?.modelUsed,
      // Governance fields (always set)
      approvalStatus: SYNC_APPROVAL_STATUS,
      systemFlags: SYNC_SYSTEM_FLAG,
    });

    const response = await fetch(W2X_ENGINE_URL, {
      method: "POST",
      body: formData,
    });

    const responseText = await response.text();
    console.log(`w2x-engine response status: ${response.status}`);
    console.log(`w2x-engine response: ${responseText.substring(0, 300)}`);

    return response.ok;
  } catch (error) {
    console.error("Error creating Salesforce record:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: SyncRequest = await req.json();
    const assetIds = payload.assetIds || (payload.assetId ? [payload.assetId] : []);
    const creatorContactId = payload.creatorContactId;
    
    if (assetIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing assetId or assetIds" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing sync for ${assetIds.length} asset(s):`, assetIds);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch assets that need syncing
    const { data: assets, error: fetchError } = await supabase
      .from("media_assets")
      .select("*")
      .in("id", assetIds);

    if (fetchError) {
      console.error("Error fetching assets:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch assets", details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!assets || assets.length === 0) {
      return new Response(
        JSON.stringify({ error: "No assets found with provided IDs" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the API data once for all assets
    let apiXml: string | undefined;
    try {
      const apiUrl = `${WMC_CONTENT_API}?orgId=${ORG_ID}&sandbox=False`;
      const response = await fetch(apiUrl);
      if (response.ok) {
        apiXml = await response.text();
        console.log(`Cached API response: ${apiXml.length} characters`);
      }
    } catch (error) {
      console.error("Error pre-fetching API:", error);
    }

    const results: Array<{
      assetId: string;
      success: boolean;
      salesforceId?: string;
      error?: string;
      action?: 'found' | 'created' | 'failed';
    }> = [];

    for (const asset of assets) {
      console.log(`\n=== Processing asset: ${asset.id} ===`);
      console.log(`Title: ${asset.title}, URL: ${asset.file_url}`);
      
      if (asset.salesforce_id) {
        console.log(`Asset already has Salesforce ID: ${asset.salesforce_id}`);
        results.push({
          assetId: asset.id,
          success: true,
          salesforceId: asset.salesforce_id,
          action: 'found',
        });
        continue;
      }

      if (!asset.file_url) {
        results.push({
          assetId: asset.id,
          success: false,
          error: "Asset has no file_url",
        });
        continue;
      }

      // First, check if the record already exists in Salesforce
      let salesforceId = await findSalesforceIdByUrl(asset.file_url, apiXml);
      
      if (salesforceId) {
        console.log(`Found existing Salesforce record: ${salesforceId}`);
        
        // Update the asset with the found ID
        const { error: updateError } = await supabase
          .from("media_assets")
          .update({
            salesforce_id: salesforceId,
            metadata: {
              ...asset.metadata,
              sfdcSyncStatus: 'success',
              sfdcSyncedAt: new Date().toISOString(),
            }
          })
          .eq("id", asset.id);

        if (updateError) {
          console.error("Error updating asset:", updateError);
        }

        results.push({
          assetId: asset.id,
          success: true,
          salesforceId,
          action: 'found',
        });
        continue;
      }

      // Record doesn't exist - create it
      console.log("No existing record found, creating new Salesforce record...");
      
      const contentType = asset.file_format?.toUpperCase() || 
                          asset.file_url.split('.').pop()?.toUpperCase() || 
                          'JPG';
      
      // Fetch tags from join table for this asset
      const { data: tagRows } = await supabase
        .from('media_asset_tags')
        .select('tag_id, media_tags(name)')
        .eq('media_asset_id', asset.id);

      const tagNames = (tagRows || [])
        .map((r: any) => r.media_tags?.name)
        .filter(Boolean);

      // Extract metadata from asset for SFDC sync
      const assetMetadata = asset.metadata || {};
      const syncMetadata: SfdcSyncMetadata = {
        prompt: assetMetadata.prompt,
        referenceImageUrl: assetMetadata.referenceImageUrl,
        generationId: assetMetadata.generationId,
        description: asset.description,
        aspectRatio: asset.resolution,
        masterSalesforceId: assetMetadata.masterSalesforceId,
        durationSeconds: asset.duration,
        negativePrompt: assetMetadata.negativePrompt,
        creativityLevel: assetMetadata.creativity,
        apiOperationId: assetMetadata.apiOperationId,
        categories: tagNames.length > 0 ? tagNames : assetMetadata.categories,
        location: assetMetadata.location,
        modelVendor: assetMetadata.modelVendor || assetMetadata.vendor,
        modelUsed: assetMetadata.modelUsed || assetMetadata.model,
        visualAnchors: assetMetadata.visualAnchors,
        extraConstraints: assetMetadata.extraConstraints || assetMetadata.styleOverride,
        negativeConstraints: assetMetadata.negativeConstraints,
        // Use creatorContactId from request, or fallback to stored metadata
        creatorContactId: creatorContactId || assetMetadata.creatorContactId,
      };
      
      const created = await createSalesforceRecord(asset.title, asset.file_url, contentType, syncMetadata);
      
      if (!created) {
        results.push({
          assetId: asset.id,
          success: false,
          error: "Failed to create Salesforce record via w2x-engine",
          action: 'failed',
        });
        
        // Update metadata to reflect failure
        await supabase
          .from("media_assets")
          .update({
            metadata: {
              ...asset.metadata,
              sfdcSyncStatus: 'failed',
              sfdcSyncError: 'w2x-engine call failed',
              sfdcSyncAttemptedAt: new Date().toISOString(),
            }
          })
          .eq("id", asset.id);
        continue;
      }

      // Wait for Salesforce to propagate and query again
      console.log("Record created, waiting for propagation...");
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Refresh the API data
      try {
        const apiUrl = `${WMC_CONTENT_API}?orgId=${ORG_ID}&sandbox=False`;
        const response = await fetch(apiUrl);
        if (response.ok) {
          apiXml = await response.text();
        }
      } catch (error) {
        console.error("Error refreshing API:", error);
      }
      
      salesforceId = await findSalesforceIdByUrl(asset.file_url, apiXml);
      
      if (salesforceId) {
        console.log(`Successfully synced, Salesforce ID: ${salesforceId}`);
        
        await supabase
          .from("media_assets")
          .update({
            salesforce_id: salesforceId,
            metadata: {
              ...asset.metadata,
              sfdcSyncStatus: 'success',
              sfdcSyncedAt: new Date().toISOString(),
              sfdcApprovalStatus: SYNC_APPROVAL_STATUS,
              sfdcSystemFlags: SYNC_SYSTEM_FLAG,
            }
          })
          .eq("id", asset.id);

        results.push({
          assetId: asset.id,
          success: true,
          salesforceId,
          action: 'created',
        });
      } else {
        results.push({
          assetId: asset.id,
          success: false,
          error: "Record created but ID not found in API response",
          action: 'failed',
        });
        
        await supabase
          .from("media_assets")
          .update({
            metadata: {
              ...asset.metadata,
              sfdcSyncStatus: 'failed',
              sfdcSyncError: 'Created but ID not found',
              sfdcSyncAttemptedAt: new Date().toISOString(),
            }
          })
          .eq("id", asset.id);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log(`\n=== SYNC COMPLETE ===`);
    console.log(`Success: ${successCount}, Failed: ${failCount}`);

    return new Response(
      JSON.stringify({
        success: failCount === 0,
        message: `Synced ${successCount}/${results.length} assets`,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error syncing assets:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

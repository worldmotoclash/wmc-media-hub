import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";
import { getS3Config, getCdnUrl, S3_PATHS } from '../_shared/s3Config.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WMC_CONTENT_API = "https://api.realintelligence.com/api/wmc-content-master.py";
const W2X_ENGINE_URL = "https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php";
const ORG_ID = "00D5e000000HEcP";

interface SalesforceFields {
  domain?: string;
  eventCode?: string;
  raceTrackCode?: string;
  contentClass?: string;
  scene?: string;
  contentType?: string;
  generationMethod?: string;
  aspectRatio?: string;
  version?: string;
  eventDate?: string;
}

interface UploadMasterRequest {
  imageBase64: string;
  filename: string;
  mimeType: string;
  width: number;
  height: number;
  title?: string;
  description?: string;
  tags?: string[];
  creatorContactId?: string;
  thumbnailBase64?: string;
  duration?: number;
  salesforceFields?: SalesforceFields;
  isPodcast?: boolean; // Flag for audio podcast classification
}

// Helper function to escape special regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Query the wmc-content-master API to find a Salesforce ID by matching URL
async function findSalesforceIdByUrl(cdnUrl: string, maxAttempts = 3): Promise<string | null> {
  console.log(`Searching for Salesforce ID matching URL: ${cdnUrl}`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Wait before querying (give Salesforce time to propagate the new record)
      const delayMs = 2000 * attempt;
      console.log(`Attempt ${attempt}/${maxAttempts}: Waiting ${delayMs}ms before querying API...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      const apiUrl = `${WMC_CONTENT_API}?orgId=${ORG_ID}&sandbox=False`;
      console.log(`Querying API: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.error(`API request failed: ${response.status}`);
        continue;
      }
      
      const xmlText = await response.text();
      console.log(`API response length: ${xmlText.length} characters`);
      
      // Find all content blocks and check if each contains our URL (block-isolated search)
      const contentBlocks = xmlText.match(/<content>[\s\S]*?<\/content>/g) || [];
      console.log(`Found ${contentBlocks.length} content blocks, searching for URL match...`);
      
      for (const block of contentBlocks) {
        // Check if this block contains our URL
        if (block.includes(cdnUrl)) {
          // Extract ID from this block
          const idMatch = block.match(/<id>([^<]+)<\/id>/);
          if (idMatch && idMatch[1]) {
            const salesforceId = idMatch[1].trim();
            console.log(`Found Salesforce ID via block search: ${salesforceId}`);
            return salesforceId;
          }
        }
      }
      
      console.log(`URL not found in API response (attempt ${attempt})`);
    } catch (error) {
      console.error(`Error querying API (attempt ${attempt}):`, error);
    }
  }
  
  console.log(`Failed to find Salesforce ID after ${maxAttempts} attempts`);
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: UploadMasterRequest = await req.json();
    console.log("Processing master image upload:", {
      filename: payload.filename,
      mimeType: payload.mimeType,
      dimensions: `${payload.width}x${payload.height}`,
    });

    const { imageBase64, filename, mimeType, width, height, title, description, tags, creatorContactId, thumbnailBase64, duration, salesforceFields, isPodcast, s3Key: preuploadedS3Key, cdnUrl: preuploadedCdnUrl, masterId: preuploadedMasterId, fileSize: preuploadedFileSize, albumId } = payload as UploadMasterRequest & { s3Key?: string; cdnUrl?: string; masterId?: string; fileSize?: number; albumId?: string };

    // Support two modes:
    // 1. Traditional: imageBase64 + filename (file sent through edge function)
    // 2. Finalize: s3Key + cdnUrl + masterId (file already uploaded directly to S3 via presigned URL)
    const isFinalizePath = !imageBase64 && preuploadedS3Key;

    if (!isFinalizePath && (!imageBase64 || !filename)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: either imageBase64+filename or s3Key+cdnUrl+masterId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Detect if this is a video, audio, or image based on mimeType
    const isVideo = mimeType?.startsWith('video/');
    const isAudio = mimeType?.startsWith('audio/');
    const isImage = !isVideo && !isAudio;
    // Defensive: strip non-alphanumeric chars from extension so reserved
    // characters (":", "*", "?", "#") can never enter S3 keys.
    const rawExt = filename.split('.').pop()?.toLowerCase() || '';
    const safeExt = rawExt.replace(/[^a-z0-9]/g, '');
    const fileExtension = safeExt || (isVideo ? 'mp4' : isAudio ? 'mp3' : 'jpg');
    const assetType = isVideo ? 'video' : isAudio ? 'audio' : 'master_image';

    console.log(`Detected media type: ${assetType}, extension: ${fileExtension}, isVideo: ${isVideo}, isAudio: ${isAudio}, duration: ${duration}, isPodcast: ${isPodcast}`);

    let s3Key: string;
    let cdnUrl: string;
    let masterId: string;
    let fileData: Uint8Array | null = null;
    let thumbnailUrl: string | null = null;

    if (isFinalizePath) {
      // === FINALIZE PATH: File already uploaded to S3 via presigned URL ===
      s3Key = preuploadedS3Key!;
      cdnUrl = preuploadedCdnUrl!;
      masterId = preuploadedMasterId!;
      console.log("Finalize path: verifying file exists in S3 at", s3Key);

      // Verify the file actually exists in S3 before creating records
      const s3Config = getS3Config();
      if (s3Config.accessKeyId && s3Config.secretAccessKey) {
        const aws = new AwsClient({
          accessKeyId: s3Config.accessKeyId,
          secretAccessKey: s3Config.secretAccessKey,
          region: s3Config.region,
          service: "s3",
        });

        const headUrl = `${s3Config.endpoint}/${s3Config.bucketName}/${s3Key}`;
        const headResponse = await aws.fetch(headUrl, { method: "HEAD" });

        if (!headResponse.ok) {
          console.error("S3 HEAD check failed:", headResponse.status, "for key:", s3Key);
          return new Response(
            JSON.stringify({
              success: false,
              error: "File not found in S3. The upload may have failed. Please try again.",
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        console.log("S3 HEAD check passed — file confirmed in bucket");

        // Upload thumbnail if provided (for videos AND images)
        if (thumbnailBase64) {
          const s3BasePath = isVideo ? S3_PATHS.VIDEO_MASTERS : isAudio ? S3_PATHS.AUDIO_MASTERS : S3_PATHS.SOCIAL_MEDIA_MASTERS;
          const thumbKey = `${s3BasePath}/${masterId}/thumbnail.jpg`;
          const thumbData = Uint8Array.from(atob(thumbnailBase64), c => c.charCodeAt(0));
          const thumbUploadUrl = `${s3Config.endpoint}/${s3Config.bucketName}/${thumbKey}`;
          
          const thumbResponse = await aws.fetch(thumbUploadUrl, {
            method: "PUT",
            body: thumbData,
            headers: { "Content-Type": "image/jpeg", "Content-Length": thumbData.length.toString() },
          });
          
          if (thumbResponse.ok) {
            thumbnailUrl = getCdnUrl(thumbKey);
            console.log("Thumbnail uploaded successfully:", thumbnailUrl);
          }
        }
      }
    } else {
      // === TRADITIONAL PATH: File sent as base64 through edge function ===
      const s3Config = getS3Config();
      
      if (!s3Config.accessKeyId || !s3Config.secretAccessKey) {
        console.error("Missing Wasabi credentials");
        return new Response(
          JSON.stringify({ error: "S3 credentials not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aws = new AwsClient({
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
        region: s3Config.region,
        service: "s3",
      });

      masterId = crypto.randomUUID();
      const s3BasePath = isVideo ? S3_PATHS.VIDEO_MASTERS : isAudio ? S3_PATHS.AUDIO_MASTERS : S3_PATHS.SOCIAL_MEDIA_MASTERS;
      s3Key = `${s3BasePath}/${masterId}/master.${fileExtension}`;

      // Upload thumbnail if provided (for videos AND images)
      if (thumbnailBase64) {
        const thumbKey = `${s3BasePath}/${masterId}/thumbnail.jpg`;
        const thumbData = Uint8Array.from(atob(thumbnailBase64), c => c.charCodeAt(0));
        const thumbUploadUrl = `${s3Config.endpoint}/${s3Config.bucketName}/${thumbKey}`;
        
        console.log("Uploading video thumbnail to S3:", thumbUploadUrl);
        
        const thumbResponse = await aws.fetch(thumbUploadUrl, {
          method: "PUT",
          body: thumbData,
          headers: {
            "Content-Type": "image/jpeg",
            "Content-Length": thumbData.length.toString(),
          },
        });
        
        if (thumbResponse.ok) {
          thumbnailUrl = getCdnUrl(thumbKey);
          console.log("Thumbnail uploaded successfully:", thumbnailUrl);
        } else {
          console.warn("Thumbnail upload failed, will use video URL as fallback");
        }
      }

      fileData = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));

      const uploadUrl = `${s3Config.endpoint}/${s3Config.bucketName}/${s3Key}`;
      console.log("Uploading to S3:", uploadUrl);

      const uploadResponse = await aws.fetch(uploadUrl, {
        method: "PUT",
        body: fileData,
        headers: {
          "Content-Type": mimeType || "image/jpeg",
          "Content-Length": fileData.length.toString(),
        },
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error("S3 upload failed:", errorText);
        return new Response(
          JSON.stringify({ error: "Failed to upload to S3", details: errorText }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      cdnUrl = getCdnUrl(s3Key);
      console.log("S3 upload successful, CDN URL:", cdnUrl);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const imageTitle = title || filename.replace(/\.[^/.]+$/, "");
    
    // Initial metadata with sync status (also store user-provided tags for backup)
    const initialMetadata = {
      width: width || 0,
      height: height || 0,
      originalFilename: filename,
      mimeType,
      masterId,
      uploadedAt: new Date().toISOString(),
      isMasterImage: isImage,
      isVideo,
      isAudio,
      isPodcast: isAudio ? isPodcast : undefined,
      duration: (isVideo || isAudio) ? duration : undefined,
      sfdcSyncStatus: 'pending' as const,
      creatorContactId,
      userProvidedTags: tags || [], // Store for debugging/backup
    };

    const insertData: Record<string, any> = {
        title: imageTitle,
        description: description || null,
        file_url: cdnUrl,
        thumbnail_url: thumbnailUrl || (isImage ? cdnUrl : null),
        source: "local_upload",
        status: "ready",
        file_format: fileExtension,
        asset_type: assetType,
        s3_key: s3Key,
        duration: (isVideo || isAudio) ? Math.round(duration || 0) : null,
        file_size: isFinalizePath ? (preuploadedFileSize || 0) : (fileData?.length || 0),
        metadata: initialMetadata,
    };

    // Add album_id if provided
    if (albumId) {
      insertData.album_id = albumId;
    }

    const { data: assetData, error: assetError } = await supabase
      .from("media_assets")
      .insert(insertData)
      .select()
      .single();

    if (assetError) {
      console.error("Failed to create asset record:", assetError);
      return new Response(
        JSON.stringify({ error: "Failed to create media asset record", details: assetError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Created media_assets record:", assetData.id);

    // === SAVE USER-PROVIDED TAGS TO DATABASE ===
    if (tags && tags.length > 0) {
      console.log("Saving user-provided tags to database:", tags);
      
      for (const tagName of tags) {
        try {
          // Find existing tag (case-insensitive)
          const { data: existingTag } = await supabase
            .from('media_tags')
            .select('id')
            .ilike('name', tagName)
            .maybeSingle();
          
          let tagId: string;
          
          if (existingTag) {
            tagId = existingTag.id;
          } else {
            // Create new tag with default color
            const { data: newTag, error: tagError } = await supabase
              .from('media_tags')
              .insert({ name: tagName, color: '#6366f1' })
              .select('id')
              .single();
            
            if (tagError) {
              console.warn(`Failed to create tag "${tagName}":`, tagError);
              continue;
            }
            tagId = newTag.id;
            console.log(`Created new tag: ${tagName} (${tagId})`);
          }
          
          // Create junction record (upsert to avoid duplicates)
          const { error: linkError } = await supabase
            .from('media_asset_tags')
            .upsert({
              media_asset_id: assetData.id,
              tag_id: tagId
            }, { onConflict: 'media_asset_id,tag_id' });
          
          if (linkError) {
            console.warn(`Failed to link tag "${tagName}" to asset:`, linkError);
          }
        } catch (tagErr) {
          console.warn(`Error processing tag "${tagName}":`, tagErr);
        }
      }
      console.log(`Saved ${tags.length} tags to database for asset ${assetData.id}`);
    }

    // === SALESFORCE SYNC ===
    let salesforceId: string | null = null;
    let sfdcSyncStatus: 'success' | 'failed' = 'failed';
    let sfdcSyncError: string | null = null;

    try {
      const fileExtension = filename.split('.').pop()?.toUpperCase() || 'JPG';
      
      const formData = new FormData();
      formData.append("retURL", "https://worldmotoclash.com");
      formData.append("sObj", "ri1__Content__c");
      formData.append("string_Name", imageTitle);
      formData.append("string_ri1__Content_Type__c", fileExtension);
      formData.append("string_ri1__URL__c", cdnUrl);
      
      // Add description if provided
      if (description) {
        formData.append("string_ri1__Description__c", description.substring(0, 32768));
      }
      
      // Add categories/tags if provided (semicolon-separated for Salesforce picklist)
      if (tags && tags.length > 0) {
        formData.append("string_ri1__Categories__c", tags.join(";"));
      }
      
      // Add duration for videos and audio (in seconds)
      if ((isVideo || isAudio) && duration) {
        formData.append("number_ri1__Length_in_Seconds__c", Math.round(duration).toString());
      }
      
      // Add file size in bytes
      formData.append("number_ri1__File_Size__c", (isFinalizePath ? (preuploadedFileSize || 0) : (fileData?.length || 0)).toString());
      
      // Add thumbnail URL for videos
      if (thumbnailUrl) {
        formData.append("string_id_ri1__Thumbnail__c", thumbnailUrl);
      }
      
      // Link to creator Contact if provided
      if (creatorContactId) {
        formData.append("lookup_ri1__Contact__c", creatorContactId);
        console.log(`Linking content to creator Contact: ${creatorContactId}`);
      }

      // === NEW SALESFORCE CATALOG FIELDS ===
      if (salesforceFields) {
        console.log("Adding Salesforce catalog fields:", salesforceFields);
        
        if (salesforceFields.domain) {
          formData.append("string_Domain__c", salesforceFields.domain);
        }
        if (salesforceFields.eventCode) {
          formData.append("string_Event_Code__c", salesforceFields.eventCode);
        }
        if (salesforceFields.raceTrackCode) {
          formData.append("string_ri1__Race_Track_Code__c", salesforceFields.raceTrackCode);
        }
        if (salesforceFields.contentClass) {
          formData.append("string_Content_Class__c", salesforceFields.contentClass);
        }
        if (salesforceFields.scene) {
          formData.append("string_Scene__c", salesforceFields.scene);
        }
        if (salesforceFields.generationMethod) {
          formData.append("string_Generation_Method__c", salesforceFields.generationMethod);
        }
        if (salesforceFields.aspectRatio) {
          formData.append("string_ri1__Aspect_Ratio__c", salesforceFields.aspectRatio);
        }
        if (salesforceFields.version) {
          formData.append("string_Version__c", salesforceFields.version);
        }
        if (salesforceFields.eventDate) {
          formData.append("date_Event_Date__c", salesforceFields.eventDate);
        }
      }

      console.log("=== SALESFORCE SYNC START ===");
      console.log("Sending to w2x-engine:", W2X_ENGINE_URL);
      console.log("FormData: Name=" + imageTitle + ", Content_Type=" + fileExtension + ", URL=" + cdnUrl);

      const sfResponse = await fetch(W2X_ENGINE_URL, {
        method: "POST",
        body: formData,
        redirect: "manual",
      });

      console.log("w2x-engine response status:", sfResponse.status);

      if (sfResponse.status === 302) {
        console.log("w2x-engine accepted record (302 redirect) — marking as pending_id for async backfill.");
        sfdcSyncStatus = 'pending_id';
        
        // Don't poll synchronously — the backfill-salesforce-ids function will resolve the ID
        await supabase
          .from("media_assets")
          .update({
            metadata: {
              ...initialMetadata,
              sfdcSyncStatus: 'pending_id',
              sfdcSyncAttemptedAt: new Date().toISOString(),
            }
          })
          .eq("id", assetData.id);
      } else {
        const sfResponseText = await sfResponse.text();
        sfdcSyncError = `w2x-engine unexpected status ${sfResponse.status}: ${sfResponseText.substring(0, 200)}`;
        console.error("w2x-engine call failed:", sfdcSyncError);
        
        await supabase
          .from("media_assets")
          .update({
            metadata: {
              ...initialMetadata,
              sfdcSyncStatus: 'failed',
              sfdcSyncError,
              sfdcSyncAttemptedAt: new Date().toISOString(),
            }
          })
          .eq("id", assetData.id);
      }
      
      console.log("=== SALESFORCE SYNC END ===");
    } catch (sfError) {
      sfdcSyncError = sfError instanceof Error ? sfError.message : "Unknown error during SFDC sync";
      console.error("Salesforce sync error:", sfError);
      
      await supabase
        .from("media_assets")
        .update({
          metadata: {
            ...initialMetadata,
            sfdcSyncStatus: 'failed',
            sfdcSyncError,
            sfdcSyncAttemptedAt: new Date().toISOString(),
          }
        })
        .eq("id", assetData.id);
    }

    // === AUTO-TAGGING ===
    // Only trigger auto-tagging if no user-provided tags exist
    if (!tags || tags.length === 0) {
      console.log("No user-provided tags, triggering auto-tagging for asset:", assetData.id);
      const autoTagUrl = `${supabaseUrl}/functions/v1/auto-tag-media-asset`;
      
      EdgeRuntime.waitUntil(
        fetch(autoTagUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
        body: JSON.stringify({
          assetId: assetData.id,
          mediaUrl: cdnUrl,
          mediaType: isVideo ? 'video' : isAudio ? 'audio' : 'image',
          isPodcast: isAudio ? isPodcast : undefined,
        }),
        }).then(res => {
          console.log(`Auto-tagging response status: ${res.status}`);
          return res.json();
        }).then(result => {
          console.log("Auto-tagging result:", result);
        }).catch(err => {
          console.error("Auto-tagging error:", err);
        })
      );
    } else {
      console.log(`Skipping auto-tagging - user provided ${tags.length} tags`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        masterId,
        assetId: assetData.id,
        cdnUrl,
        s3Key,
        salesforceId,
        sfdcSyncStatus,
        sfdcSyncError: sfdcSyncStatus === 'failed' ? sfdcSyncError : undefined,
        dimensions: { width, height },
        autoTaggingQueued: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error uploading master image:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { date } = await req.json().catch(() => ({}));
    const targetDate = date || new Date().toISOString().split("T")[0];

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query media_assets for the target date
    const startOfDay = `${targetDate}T00:00:00.000Z`;
    const endOfDay = `${targetDate}T23:59:59.999Z`;

    const { data: assets, error: assetsError } = await supabase
      .from("media_assets")
      .select("id, title, asset_type, thumbnail_url, file_url, file_format, master_id")
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay);

    if (assetsError) {
      throw new Error(`Failed to query media_assets: ${assetsError.message}`);
    }

    if (!assets || assets.length === 0) {
      return new Response(
        JSON.stringify({ message: "No content for this date, no diary entry created.", date: targetDate }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Count by asset_type
    let videoCount = 0;
    let imageCount = 0;
    let audioCount = 0;

    const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.m4v'];
    const isVideoUrl = (url: string | null): boolean => {
      if (!url) return false;
      const lower = url.toLowerCase().split('?')[0];
      return VIDEO_EXTENSIONS.some(ext => lower.endsWith(ext));
    };

    const contentItems = assets.map((a) => {
      const type = (a.asset_type || "").toLowerCase();
      if (type === "video") videoCount++;
      else if (type === "image") imageCount++;
      else if (type === "audio") audioCount++;

      // Resolve thumbnail: if it's a video URL (not a real thumbnail), try constructing the expected path
      let resolvedThumbnail = a.thumbnail_url;
      if (!resolvedThumbnail || isVideoUrl(resolvedThumbnail)) {
        if (type === "video" && a.master_id) {
          resolvedThumbnail = `https://media.worldmotoclash.com/VIDEOS_KNEWTV/masters/${a.master_id}/thumbnail.jpg`;
        } else {
          resolvedThumbnail = null;
        }
      }

      return {
        id: a.id,
        title: a.title,
        asset_type: a.asset_type,
        thumbnail_url: resolvedThumbnail,
        file_url: a.file_url,
        file_format: a.file_format,
      };
    });

    const total = videoCount + imageCount + audioCount;

    // Calculate week_start (most recent Monday)
    const d = new Date(targetDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d.setDate(diff)).toISOString().split("T")[0];

    // Generate summary
    const parts: string[] = [];
    if (videoCount > 0) parts.push(`${videoCount} video${videoCount > 1 ? "s" : ""}`);
    if (imageCount > 0) parts.push(`${imageCount} image${imageCount > 1 ? "s" : ""}`);
    if (audioCount > 0) parts.push(`${audioCount} audio file${audioCount > 1 ? "s" : ""}`);
    const summaryText = `Today's Media Hub update includes ${parts.join(", ")} (${total} total items) supporting World Moto Clash media production.`;

    // Upsert diary entry
    const { error: upsertError } = await supabase
      .from("media_diary_entries")
      .upsert(
        {
          date: targetDate,
          video_count: videoCount,
          image_count: imageCount,
          audio_count: audioCount,
          summary_text: summaryText,
          content_items: contentItems,
          week_start: weekStart,
          salesforce_synced: false,
        },
        { onConflict: "date" }
      );

    if (upsertError) {
      throw new Error(`Failed to upsert diary entry: ${upsertError.message}`);
    }

    // POST to w2x-engine for Salesforce sync
    const diaryUrl = `https://mediahub.worldmotoclash.com/mediahub/diary/${targetDate}`;
    const w2xPayload = new URLSearchParams({
      sObj: "MediaHub_Diary__c",
      action: "upsert",
      externalIdField: "Diary_Date__c",
      string_Name: targetDate,
      date_Diary_Date__c: targetDate,
      text_Summary__c: summaryText,
      number_Video_Count__c: String(videoCount),
      number_Image_Count__c: String(imageCount),
      number_Audio_Count__c: String(audioCount),
      string_Diary_URL__c: diaryUrl,
      date_Week_Start__c: weekStart,
    });

    let sfdcSynced = false;
    try {
      const w2xResponse = await fetch(
        "https://americanmotorcyclist.org/wp-content/themes/flavor/inc/api/w2x-engine.php",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: w2xPayload.toString(),
        }
      );
      if (w2xResponse.ok) {
        sfdcSynced = true;
      } else {
        console.error("w2x-engine response:", await w2xResponse.text());
      }
    } catch (syncErr) {
      console.error("Salesforce sync error:", syncErr);
    }

    // Update salesforce_synced flag
    if (sfdcSynced) {
      await supabase
        .from("media_diary_entries")
        .update({ salesforce_synced: true })
        .eq("date", targetDate);
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: targetDate,
        video_count: videoCount,
        image_count: imageCount,
        audio_count: audioCount,
        total,
        salesforce_synced: sfdcSynced,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating diary entry:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

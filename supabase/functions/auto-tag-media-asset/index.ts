import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ========== KNEWTV AI CONTRACT PICKLIST VALUES ==========

const APPROVED_CATEGORIES = [
  'Promotional', 'Fan Reactions', 'Racer Backstories', 
  'Website Swiper AI Video', 'News', 'Education & Training', 'Motorworks', 'Unclassified',
  // Audio-specific categories
  'Podcast', 'Interview Audio', 'Race Commentary', 'Sound Effects', 'Music Track'
];

const APPROVED_CONTENT_TYPES = [
  'Promotional', 'Teaser', 'Interview', 'Behind the Scenes',
  'Announcement', 'Highlight', 'Educational', 'Experimental'
];

const APPROVED_LOCATIONS = [
  'Race Track – On Track', 'Race Track – Grid / Start', 'Race Track – Pit Lane',
  'Race Track – Paddock / Garage', 'Race Track – Victory / Podium', 'Studio',
  'Interview / Talking Head', 'Outdoor – Day', 'Outdoor – Night', 'Sunset / Golden Hour',
  'Urban / City', 'Industrial / Warehouse', 'Crowd / Fan Experience',
  'Festival / Event Atmosphere', 'Hospitality / VIP Experience', 'Lifestyle / Off-Track',
  'Aerial / Drone', 'POV / Helmet Cam', 'Onboard / Vehicle Mounted',
  'AI-Generated / Virtual', 'Mixed Reality / Composited', 'Abstract / Graphic',
  'Unknown / Unclassified'
];

const APPROVED_MOODS = [
  'Intense', 'High Energy', 'Aggressive', 'Adrenaline', 'Dramatic', 'Cinematic', 'Epic',
  'Triumphant', 'Celebratory', 'Competitive', 'Focused', 'Tense', 'Gritty', 'Raw', 'Serious',
  'Confident', 'Bold', 'Rebellious', 'Futuristic', 'Sleek', 'Premium', 'Inspirational',
  'Emotional', 'Playful', 'Fun', 'Relaxed', 'Chill', 'Atmospheric', 'Mysterious', 'Dark',
  'Moody', 'Bright', 'Uplifting', 'Heroic', 'Technical', 'Informative', 'Neutral'
];

// ========== INTERFACES ==========

interface AutoTagRequest {
  assetId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video' | 'audio';
  skipSalesforce?: boolean;
  isPodcast?: boolean;
  suggestTitle?: boolean;
  titleOnly?: boolean;
}

interface SalesforceAnalysisResult {
  description: string;
  categories: string[];
  contentType: string;
  location: string;
  mood: string;
  confidence: number;
  suggestedTitle?: string;
}

// ========== KNEWTV AI CONTRACT PROMPT ==========

const KNEWTV_SYSTEM_PROMPT = `You are an AI video analysis and metadata classification engine for KnewTV Media Hub.

Your job is to analyze uploaded media and generate structured metadata that maps cleanly and consistently into Salesforce.

Follow the rules below exactly.

🎯 1. REQUIRED OUTPUT FIELDS (DO NOT SKIP)
You must always return values for the following Salesforce fields:
- ri1__Description__c
- ri1__Categories__c  
- ri1__Content_Type__c
- ri1__Location__c
- ri1__AI_Creativity_Level__c (mood/tone)
- ri1__AI_Percentage__c (confidence score)

📝 2. DESCRIPTION (ri1__Description__c)
Write a clear, neutral, human-readable summary of what happens in the media.
Do NOT mention "AI", "model", or "analysis".
1–3 sentences max.
Describe subject, action, and setting.

🗂️ 3. CATEGORIES (ri1__Categories__c)
Select 1–3 values max from the approved Category picklist.
Choose categories based on content intent, not camera style or mood.
Never invent new categories.
If unsure, include Unclassified.

🎬 4. CONTENT TYPE (ri1__Content_Type__c)
Select exactly ONE from: Promotional, Teaser, Interview, Behind the Scenes, Announcement, Highlight, Educational, Experimental
If no clear intent exists, default to: Promotional

🌍 5. SCENE / LOCATION (ri1__Location__c)
Select exactly one from the approved Scene list.
PRIORITY RULES:
- If motorsport racing context is visible → choose a Race Track scene.
- Race Track scenes override Outdoor / City / Studio.
- Camera style does NOT override scene.
If uncertain → Unknown / Unclassified

🎭 6. MOOD / TONE (ri1__AI_Creativity_Level__c)
Select 1 primary mood only.
Choose emotional tone, not color or lighting.
Do NOT select more than one.
If no dominant mood exists → Neutral

📊 7. CONFIDENCE SCORE (ri1__AI_Percentage__c)
Output a numeric confidence value from 0–100.
Represents confidence in correct scene + mood classification.
If confidence < 80:
- Use safer defaults
- Prefer Neutral mood
- Prefer Unknown / Unclassified scene

🚫 8. FORBIDDEN BEHAVIOR
- Do NOT create new picklist values.
- Do NOT return free-text tags.
- Do NOT exceed category or mood limits.`;

// ========== AI ANALYSIS FUNCTION ==========

async function performSalesforceAnalysis(
  mediaUrl: string, 
  mediaType: 'image' | 'video' | 'audio',
  apiKey: string,
  isPodcast?: boolean
): Promise<SalesforceAnalysisResult> {
  console.log(`[AI] Performing Salesforce-mapped analysis for ${mediaType}: ${mediaUrl}`);
  
  // For audio files, use filename-based text analysis (no visual data)
  if (mediaType === 'audio') {
    return performAudioAnalysis(mediaUrl, apiKey, isPodcast);
  }
  
  const userPrompt = `Analyze this ${mediaType} and classify it for Salesforce Content records.

Media URL: ${mediaUrl}

Return the classification using the analyze_media_for_salesforce function.`;

  const tools = [{
    type: 'function',
    function: {
      name: 'analyze_media_for_salesforce',
      description: 'Classify media content for Salesforce ri1__Content__c records following KnewTV data governance rules',
      parameters: {
        type: 'object',
        properties: {
          description: { 
            type: 'string', 
            description: '1-3 sentence factual description. No AI/model mentions. Describe subject, action, setting.' 
          },
          suggestedTitle: {
            type: 'string',
            description: 'A concise, descriptive title for this media (3-8 words). Replace raw filenames like "20260307_115304" with meaningful names like "Daytona Pit Lane Aerial View". Use Title Case.'
          },
          categories: { 
            type: 'array', 
            items: { type: 'string', enum: APPROVED_CATEGORIES },
            maxItems: 3,
            description: 'Select 1-3 categories based on content intent'
          },
          contentType: { 
            type: 'string', 
            enum: APPROVED_CONTENT_TYPES,
            description: 'Single content type. Default to Promotional if unclear.'
          },
          location: { 
            type: 'string', 
            enum: APPROVED_LOCATIONS,
            description: 'Scene/location. Race Track scenes take priority. Use Unknown / Unclassified if uncertain.'
          },
          mood: { 
            type: 'string', 
            enum: APPROVED_MOODS,
            description: 'Single primary mood/tone. Default to Neutral if unclear.'
          },
          confidence: { 
            type: 'integer', 
            minimum: 0, 
            maximum: 100,
            description: 'Confidence 0-100 in classification accuracy. Use safer defaults if <80.'
          }
        },
        required: ['description', 'suggestedTitle', 'categories', 'contentType', 'location', 'mood', 'confidence']
      }
    }
  }];

  const reqBody = JSON.stringify({
    model: 'google/gemini-2.5-flash',
    messages: [
      { role: 'system', content: KNEWTV_SYSTEM_PROMPT },
      { 
        role: 'user', 
        content: [
          { type: 'text', text: userPrompt },
          { type: 'image_url', image_url: { url: mediaUrl } }
        ]
      }
    ],
    tools,
    tool_choice: { type: 'function', function: { name: 'analyze_media_for_salesforce' } }
  });
  const reqHeaders = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  let response: Response | null = null;
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST', headers: reqHeaders, body: reqBody,
    });
    if (response.ok || (response.status !== 502 && response.status !== 503)) break;
    const errorText = await response.text();
    console.warn(`[AI] Gateway transient error (attempt ${attempt}/${MAX_RETRIES}): ${response.status} ${errorText}`);
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }

  if (!response || !response.ok) {
    const errorText = response ? await response.text() : 'no response';
    console.error('[AI] Gateway error after retries:', response?.status, errorText);
    throw new Error(`AI Gateway error: ${response?.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall || toolCall.function.name !== 'analyze_media_for_salesforce') {
    throw new Error('No valid tool call response from AI');
  }

  const result = JSON.parse(toolCall.function.arguments);
  console.log('[AI] Salesforce analysis result:', result);

  // Apply safety defaults if confidence is low
  const confidence = result.confidence || 50;
  const useSafeDefaults = confidence < 80;

  return {
    description: result.description || 'Media content uploaded to KnewTV.',
    categories: result.categories?.length > 0 ? result.categories : ['Unclassified'],
    contentType: useSafeDefaults && !result.contentType ? 'Promotional' : (result.contentType || 'Promotional'),
    location: useSafeDefaults ? (result.location || 'Unknown / Unclassified') : (result.location || 'Unknown / Unclassified'),
    mood: useSafeDefaults ? 'Neutral' : (result.mood || 'Neutral'),
    confidence,
    suggestedTitle: result.suggestedTitle || undefined,
  };
}

// ========== AUDIO ANALYSIS FUNCTION ==========

async function performAudioAnalysis(
  mediaUrl: string,
  apiKey: string,
  isPodcast?: boolean
): Promise<SalesforceAnalysisResult> {
  // Extract filename from URL for analysis
  const urlParts = mediaUrl.split('/');
  const filename = urlParts[urlParts.length - 1] || 'audio_file';
  
  console.log(`[AI] Performing audio classification based on filename: ${filename}, isPodcast: ${isPodcast}`);
  
  const audioCategories = isPodcast 
    ? ['Podcast'] 
    : APPROVED_CATEGORIES.filter(c => ['Podcast', 'Interview Audio', 'Race Commentary', 'Sound Effects', 'Music Track', 'News', 'Education & Training'].includes(c));
  
  const userPrompt = `Classify this audio file for a motorsports media library (World Moto Clash).

Filename: "${filename}"
${isPodcast ? 'Note: This has been marked as a PODCAST episode by the uploader.' : ''}

Based on the filename, determine:
1. A brief description (1-2 sentences) of what this audio likely contains
2. The most appropriate category from: ${audioCategories.join(', ')}
3. Content type (Interview, Behind the Scenes, Announcement, Highlight, Educational)
4. Mood/tone (Informative, Inspirational, Intense, Relaxed, etc.)

Return the classification using the analyze_media_for_salesforce function.`;

  const tools = [{
    type: 'function',
    function: {
      name: 'analyze_media_for_salesforce',
      description: 'Classify audio content for Salesforce ri1__Content__c records',
      parameters: {
        type: 'object',
        properties: {
          description: { 
            type: 'string', 
            description: 'Brief description of the audio content based on filename' 
          },
          categories: { 
            type: 'array', 
            items: { type: 'string', enum: APPROVED_CATEGORIES },
            maxItems: 3,
            description: 'Select 1-3 categories. Use Podcast if marked as podcast.'
          },
          contentType: { 
            type: 'string', 
            enum: APPROVED_CONTENT_TYPES,
            description: 'Single content type. Default to Interview for podcasts.'
          },
          location: { 
            type: 'string', 
            enum: APPROVED_LOCATIONS,
            description: 'For audio, usually Interview / Talking Head or Studio'
          },
          mood: { 
            type: 'string', 
            enum: APPROVED_MOODS,
            description: 'Single primary mood/tone'
          },
          confidence: { 
            type: 'integer', 
            minimum: 0, 
            maximum: 100,
            description: 'Lower confidence (40-70) for audio since we only have filename'
          }
        },
        required: ['description', 'categories', 'contentType', 'location', 'mood', 'confidence']
      }
    }
  }];

  const audioReqBody = JSON.stringify({
    model: 'google/gemini-2.5-flash',
    messages: [
      { role: 'system', content: KNEWTV_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    tools,
    tool_choice: { type: 'function', function: { name: 'analyze_media_for_salesforce' } }
  });
  const audioReqHeaders = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  };

  let response: Response | null = null;
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST', headers: audioReqHeaders, body: audioReqBody,
    });
    if (response.ok || (response.status !== 502 && response.status !== 503)) break;
    console.warn(`[AI] Audio gateway transient error (attempt ${attempt}/${MAX_RETRIES}): ${response.status}`);
    if (attempt < MAX_RETRIES) {
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
    }
  }

  if (!response || !response.ok) {
    console.error('[AI] Gateway error for audio after retries:', response?.status);
    // Return default audio classification
    return {
      description: isPodcast ? 'Podcast episode from World Moto Clash.' : 'Audio content from World Moto Clash.',
      categories: isPodcast ? ['Podcast'] : ['Unclassified'],
      contentType: isPodcast ? 'Interview' : 'Promotional',
      location: 'Interview / Talking Head',
      mood: 'Informative',
      confidence: 50,
    };
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall || toolCall.function.name !== 'analyze_media_for_salesforce') {
    console.warn('[AI] No valid tool call for audio, using defaults');
    return {
      description: isPodcast ? 'Podcast episode from World Moto Clash.' : 'Audio content from World Moto Clash.',
      categories: isPodcast ? ['Podcast'] : ['Unclassified'],
      contentType: isPodcast ? 'Interview' : 'Promotional',
      location: 'Interview / Talking Head',
      mood: 'Informative',
      confidence: 50,
    };
  }

  const result = JSON.parse(toolCall.function.arguments);
  console.log('[AI] Audio analysis result:', result);

  // Ensure podcast category if flagged
  let categories = result.categories || [];
  if (isPodcast && !categories.includes('Podcast')) {
    categories = ['Podcast', ...categories.filter((c: string) => c !== 'Podcast')].slice(0, 3);
  }

  return {
    description: result.description || (isPodcast ? 'Podcast episode.' : 'Audio content.'),
    categories: categories.length > 0 ? categories : (isPodcast ? ['Podcast'] : ['Unclassified']),
    contentType: result.contentType || (isPodcast ? 'Interview' : 'Promotional'),
    location: result.location || 'Interview / Talking Head',
    mood: result.mood || 'Informative',
    confidence: result.confidence || 50,
  };
}

// ========== TAG HELPERS ==========

async function findOrCreateTag(
  supabase: ReturnType<typeof createClient>,
  tagName: string,
  color?: string
): Promise<string> {
  const { data: existingTag } = await supabase
    .from('media_tags')
    .select('id')
    .ilike('name', tagName)
    .maybeSingle();

  if (existingTag) {
    return existingTag.id;
  }

  const tagColor = color || getTagColor(tagName);
  const { data: newTag, error } = await supabase
    .from('media_tags')
    .insert({ name: tagName, color: tagColor })
    .select('id')
    .single();

  if (error) {
    console.error(`[Tag] Failed to create tag "${tagName}":`, error);
    throw error;
  }

  console.log(`[Tag] Created new tag: ${tagName} (${newTag.id})`);
  return newTag.id;
}

function getTagColor(tagName: string): string {
  // Location tags - Blue
  if (APPROVED_LOCATIONS.some(loc => tagName.toLowerCase().includes(loc.toLowerCase().split(' ')[0]))) {
    return '#3b82f6';
  }
  // Mood tags - Purple
  if (APPROVED_MOODS.includes(tagName)) {
    return '#8b5cf6';
  }
  // Category tags - Green
  if (APPROVED_CATEGORIES.includes(tagName)) {
    return '#22c55e';
  }
  // Content type tags - Orange
  if (APPROVED_CONTENT_TYPES.includes(tagName)) {
    return '#f97316';
  }
  return '#6366f1'; // Default indigo
}

function extractTagsFromAnalysis(analysis: SalesforceAnalysisResult): string[] {
  const tags: string[] = [];

  // Add categories as tags
  for (const category of analysis.categories) {
    if (category && category !== 'Unclassified') {
      tags.push(category);
    }
  }

  // Add location as tag (simplified)
  if (analysis.location && analysis.location !== 'Unknown / Unclassified') {
    tags.push(analysis.location);
  }

  // Add mood as tag
  if (analysis.mood && analysis.mood !== 'Neutral') {
    tags.push(analysis.mood);
  }

  // Add content type as tag
  if (analysis.contentType) {
    tags.push(analysis.contentType);
  }

  return [...new Set(tags)];
}

// ========== MAIN HANDLER ==========

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { assetId, mediaUrl, mediaType, skipSalesforce, isPodcast } = await req.json() as AutoTagRequest;

    if (!assetId || !mediaUrl || !mediaType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: assetId, mediaUrl, mediaType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`=== Auto-tagging asset ${assetId} (KnewTV Contract) ===`);
    console.log(`Media URL: ${mediaUrl}`);
    console.log(`Media Type: ${mediaType}`);
    console.log(`Is Podcast: ${isPodcast}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Perform Salesforce-mapped AI analysis
    console.log('[Step 1] Performing Salesforce-mapped AI analysis...');
    const analysis = await performSalesforceAnalysis(mediaUrl, mediaType, LOVABLE_API_KEY, isPodcast);

    // Step 2: Extract tag names from analysis
    console.log('[Step 2] Extracting tags from analysis...');
    const tagNames = extractTagsFromAnalysis(analysis);
    console.log(`[Tags] Extracted ${tagNames.length} tags:`, tagNames);

    // Step 3: Find or create tags in media_tags table
    console.log('[Step 3] Finding/creating tags in database...');
    const tagIds: string[] = [];
    for (const tagName of tagNames) {
      try {
        const tagId = await findOrCreateTag(supabase, tagName);
        tagIds.push(tagId);
      } catch (err) {
        console.warn(`[Tag] Skipping tag "${tagName}" due to error:`, err);
      }
    }

    // Step 4: Remove existing tags for this asset
    console.log('[Step 4] Removing existing tags...');
    await supabase
      .from('media_asset_tags')
      .delete()
      .eq('media_asset_id', assetId);

    // Step 5: Create new tag associations
    console.log('[Step 5] Creating tag associations...');
    if (tagIds.length > 0) {
      const tagRelations = tagIds.map(tagId => ({
        media_asset_id: assetId,
        tag_id: tagId
      }));

      const { error: insertError } = await supabase
        .from('media_asset_tags')
        .insert(tagRelations);

      if (insertError) {
        console.error('[Tags] Failed to insert tag relations:', insertError);
      } else {
        console.log(`[Tags] Created ${tagRelations.length} tag associations`);
      }
    }

    // Step 6: Update asset metadata with Salesforce-mapped analysis
    console.log('[Step 6] Updating asset metadata with SFDC-mapped analysis...');
    const { error: updateError } = await supabase
      .from('media_assets')
      .update({
        description: analysis.description || undefined,
        metadata: {
          sfdcAnalysis: {
            description: analysis.description,
            categories: analysis.categories,
            contentType: analysis.contentType,
            location: analysis.location,
            mood: analysis.mood,
            confidence: analysis.confidence,
          },
          analyzedAt: new Date().toISOString(),
          autoTagged: true,
          autoTaggedAt: new Date().toISOString(),
        },
        status: 'ready',
        updated_at: new Date().toISOString(),
      })
      .eq('id', assetId);

    if (updateError) {
      console.error('[Asset] Failed to update metadata:', updateError);
    }

    // Step 7: Log activity
    await supabase
      .from('content_review_activities')
      .insert({
        media_asset_id: assetId,
        action: 'auto_tagged_sfdc',
        details: {
          tagCount: tagIds.length,
          tags: tagNames,
          sfdcMapping: {
            description: analysis.description,
            categories: analysis.categories.join(';'),
            contentType: analysis.contentType,
            location: analysis.location,
            mood: analysis.mood,
            confidence: analysis.confidence,
          },
          processingTimeMs: Date.now() - startTime,
        }
      });

    const duration = Date.now() - startTime;
    console.log(`=== Auto-tagging complete in ${duration}ms ===`);

    return new Response(
      JSON.stringify({
        success: true,
        assetId,
        tagsApplied: tagNames,
        tagCount: tagIds.length,
        sfdcMapping: {
          'ri1__Description__c': analysis.description,
          'ri1__Categories__c': analysis.categories.join(';'),
          'ri1__Content_Type__c': analysis.contentType,
          'ri1__Location__c': analysis.location,
          'ri1__AI_Creativity_Level__c': analysis.mood,
          'ri1__AI_Percentage__c': analysis.confidence,
        },
        processingTimeMs: duration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Error] Auto-tagging failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

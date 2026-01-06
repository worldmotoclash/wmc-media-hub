import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tag categories that map to media_tags
const SCENE_TAGS = [
  'Race Track', 'Pit Lane', 'Paddock', 'Victory', 'Studio',
  'Interview', 'Product', 'Demo', 'Outdoor', 'Night',
  'Sunset', 'Urban', 'Industrial', 'Crowd', 'Event',
  'Lifestyle', 'VIP', 'Aerial', 'POV', 'Onboard',
  'AI-Generated', 'Mixed Reality', 'Abstract'
];

const MOOD_TAGS = [
  'Intense', 'High Energy', 'Aggressive', 'Dramatic', 'Cinematic',
  'Epic', 'Triumphant', 'Celebratory', 'Competitive', 'Focused',
  'Gritty', 'Raw', 'Confident', 'Bold', 'Futuristic',
  'Sleek', 'Premium', 'Inspirational', 'Emotional', 'Playful',
  'Relaxed', 'Atmospheric', 'Mysterious', 'Dark', 'Bright'
];

const ENERGY_TAGS = ['Low Energy', 'Medium Energy', 'High Energy', 'Explosive'];

const USE_CASE_TAGS = [
  'Hero Content', 'Social Feed', 'Short-Form', 'Paid Ad', 'Digital Signage',
  'Website', 'Email Marketing', 'Press', 'Presentation', 'Sponsor Activation',
  'Merch', 'Event Promo', 'Highlight Reel', 'Archive', 'Training'
];

interface AutoTagRequest {
  assetId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  skipSalesforce?: boolean;
}

interface AIAnalysisResult {
  objects: string[];
  actions: string;
  scene: string;
  mood: string;
  energy: string;
  useCase: string;
  description: string;
  confidence: number;
}

// Perform AI visual analysis using Lovable AI Gateway
async function performAIAnalysis(
  mediaUrl: string, 
  mediaType: 'image' | 'video',
  apiKey: string
): Promise<AIAnalysisResult> {
  console.log(`[AI] Performing analysis for ${mediaType}: ${mediaUrl}`);
  
  const systemPrompt = `You are an AI media analyst specializing in motorsport and racing content. 
Analyze the provided ${mediaType} and extract semantic intelligence for content tagging.
Be precise with your classifications. Keep descriptions factual and concise.`;

  const userPrompt = `Analyze this ${mediaType} and extract:
1. OBJECTS: Primary physical elements visible (e.g., motorcycle, helmet, crowd, track)
2. ACTIONS: Dominant actions as comma-separated verb phrases (e.g., racing, overtaking)
3. SCENE: Single best category (Race Track, Pit Lane, Paddock, Studio, Interview, Outdoor, Night, Sunset, Urban, Aerial, POV, AI-Generated, Abstract, etc.)
4. MOOD: Dominant tone (Intense, Cinematic, Epic, Celebratory, Competitive, Gritty, Premium, Atmospheric, etc.)
5. ENERGY: Level (Low, Medium, High, Explosive)
6. USE CASE: Primary use (Hero Content, Social Feed, Short-Form, Paid Ad, Website, Press, Event Promo, Archive, etc.)
7. DESCRIPTION: 1-2 sentence factual description
8. CONFIDENCE: Your confidence 0.0-1.0

Media URL: ${mediaUrl}`;

  const tools = [{
    type: 'function',
    function: {
      name: 'analyze_media',
      description: 'Extract semantic tags from media content',
      parameters: {
        type: 'object',
        properties: {
          objects: { type: 'array', items: { type: 'string' } },
          actions: { type: 'string' },
          scene: { type: 'string' },
          mood: { type: 'string' },
          energy: { type: 'string', enum: ['Low', 'Medium', 'High', 'Explosive'] },
          useCase: { type: 'string' },
          description: { type: 'string' },
          confidence: { type: 'number', minimum: 0, maximum: 1 }
        },
        required: ['objects', 'actions', 'scene', 'mood', 'energy', 'useCase', 'description', 'confidence']
      }
    }
  }];

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { 
          role: 'user', 
          content: [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: mediaUrl } }
          ]
        }
      ],
      tools,
      tool_choice: { type: 'function', function: { name: 'analyze_media' } }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[AI] Gateway error:', response.status, errorText);
    throw new Error(`AI Gateway error: ${response.status}`);
  }

  const data = await response.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  
  if (!toolCall || toolCall.function.name !== 'analyze_media') {
    throw new Error('No valid tool call response from AI');
  }

  const result = JSON.parse(toolCall.function.arguments);
  console.log('[AI] Analysis result:', result);

  return {
    objects: result.objects || [],
    actions: result.actions || '',
    scene: result.scene || 'Unknown',
    mood: result.mood || 'Neutral',
    energy: result.energy || 'Medium',
    useCase: result.useCase || 'Archive',
    description: result.description || '',
    confidence: result.confidence || 0.5,
  };
}

// Find or create a tag by name
async function findOrCreateTag(
  supabase: ReturnType<typeof createClient>,
  tagName: string,
  color?: string
): Promise<string> {
  // First try to find existing tag (case-insensitive)
  const { data: existingTag } = await supabase
    .from('media_tags')
    .select('id')
    .ilike('name', tagName)
    .maybeSingle();

  if (existingTag) {
    return existingTag.id;
  }

  // Create new tag
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

// Get color based on tag category
function getTagColor(tagName: string): string {
  if (SCENE_TAGS.some(t => tagName.toLowerCase().includes(t.toLowerCase()))) {
    return '#3b82f6'; // Blue for scene
  }
  if (MOOD_TAGS.some(t => tagName.toLowerCase().includes(t.toLowerCase()))) {
    return '#8b5cf6'; // Purple for mood
  }
  if (ENERGY_TAGS.some(t => tagName.toLowerCase().includes(t.toLowerCase()))) {
    return '#ef4444'; // Red for energy
  }
  if (USE_CASE_TAGS.some(t => tagName.toLowerCase().includes(t.toLowerCase()))) {
    return '#22c55e'; // Green for use case
  }
  return '#6366f1'; // Default indigo
}

// Map AI analysis to tag names
function extractTagsFromAnalysis(analysis: AIAnalysisResult): string[] {
  const tags: string[] = [];

  // Add scene tag
  if (analysis.scene) {
    tags.push(analysis.scene);
  }

  // Add mood tag
  if (analysis.mood) {
    tags.push(analysis.mood);
  }

  // Add energy tag with suffix for clarity
  if (analysis.energy) {
    tags.push(`${analysis.energy} Energy`);
  }

  // Add use case tag
  if (analysis.useCase) {
    tags.push(analysis.useCase);
  }

  // Add object tags (limit to top 5)
  const objectTags = analysis.objects.slice(0, 5);
  for (const obj of objectTags) {
    if (obj.length > 2 && obj.length < 30) {
      // Capitalize first letter
      tags.push(obj.charAt(0).toUpperCase() + obj.slice(1).toLowerCase());
    }
  }

  return [...new Set(tags)]; // Remove duplicates
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { assetId, mediaUrl, mediaType, skipSalesforce } = await req.json() as AutoTagRequest;

    if (!assetId || !mediaUrl || !mediaType) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: assetId, mediaUrl, mediaType' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`=== Auto-tagging asset ${assetId} ===`);
    console.log(`Media URL: ${mediaUrl}`);
    console.log(`Media Type: ${mediaType}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Perform AI analysis
    console.log('[Step 1] Performing AI analysis...');
    const analysis = await performAIAnalysis(mediaUrl, mediaType, LOVABLE_API_KEY);

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

    // Step 6: Update asset metadata with AI analysis
    console.log('[Step 6] Updating asset metadata...');
    const { error: updateError } = await supabase
      .from('media_assets')
      .update({
        description: analysis.description || undefined,
        metadata: {
          aiAnalysis: {
            objects: analysis.objects,
            actions: analysis.actions,
            scene: analysis.scene,
            mood: analysis.mood,
            energy: analysis.energy,
            useCase: analysis.useCase,
            confidence: analysis.confidence,
            analyzedAt: new Date().toISOString(),
          },
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
        action: 'auto_tagged',
        details: {
          tagCount: tagIds.length,
          tags: tagNames,
          confidence: analysis.confidence,
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
        analysis: {
          scene: analysis.scene,
          mood: analysis.mood,
          energy: analysis.energy,
          useCase: analysis.useCase,
          confidence: analysis.confidence,
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

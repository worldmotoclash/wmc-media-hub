import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getS3Config, getCdnUrl, S3_PATHS } from '../_shared/s3Config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WMC_CONTENT_API = "https://api.realintelligence.com/api/wmc-content-master.py";
const W2X_ENGINE_URL = "https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/w2x-engine.php";
const ORG_ID = "00D5e000000HEcP";

// Template prompt definitions for 3x3 grid generation
const TEMPLATE_PROMPTS: Record<string, string> = {
  foundational: `Ultra-realistic waist-up cinematic portrait of [CHARACTER] in [ENVIRONMENT].
Wearing [OUTFIT DETAILS] with [ACCESSORIES].
[AGE / ETHNICITY / FEATURES], natural skin texture and subtle imperfections.
Facing the camera with an intentional expression.
Cinematic lighting with clear key light and rim separation.
Shot on [LENS TYPE], shallow depth, softly blurred background.
Film-inspired color grade, high dynamic range, subtle grain.
Grounded realism, accurate proportions, no distortion.`,

  version1: `<instruction> Analyze the entire composition of the input image. Identify ALL key subjects present (whether it's a single person, a group/couple, a vehicle, or a specific object) and their spatial relationship/interaction.
Generate a cohesive 3x3 grid "Cinematic Contact Sheet" featuring 9 distinct camera shots of exactly these subjects in the same environment.
You must adapt the standard cinematic shot types to fit the content (e.g., if a group, keep the group together; if an object, frame the whole object):
Row 1 (Establishing Context):
Extreme Long Shot (ELS): The subject(s) are seen small within the vast environment.
Long Shot (LS): The complete subject(s) or group is visible from top to bottom (head to toe / wheels to roof).
Medium Long Shot (American/3-4): Framed from knees up (for people) or a 3/4 view (for objects).
Row 2 (The Core Coverage): 4. Medium Shot (MS): Framed from the waist up (or the central core of the object). Focus on interaction/action. 5. Medium Close-Up (MCU): Framed from chest up. Intimate framing of the main subject(s). 6. Close-Up (CU): Tight framing on the face(s) or the "front" of the object.
Row 3 (Details & Angles): 7. Extreme Close-Up (ECU): Macro detail focusing intensely on a key feature (eyes, hands, logo, texture). 8. Low Angle Shot (Worm's Eye): Looking up at the subject(s) from the ground (imposing/heroic). 9. High Angle Shot (Bird's Eye): Looking down on the subject(s) from above.
Ensure strict consistency: The same people/objects, same clothes, and same lighting across all 9 panels. The depth of field should shift realistically (bokeh in close-ups). </instruction>
A professional 3x3 cinematic storyboard grid containing 9 panels.
The grid showcases the specific subject/scene from the input image in a comprehensive range of focal lengths.
Top Row: Wide environmental shot, Full view, 3/4 cut.
Middle Row: Waist-up view, Chest-up view, Face/Front close-up.
Bottom Row: Macro detail, Low Angle, High Angle.
All frames feature photorealistic textures, consistent cinematic color grading, and correct framing for the specific number of subjects or objects analyzed.
extract the still x.y`,

  version2: `<role> You are an award-winning trailer director + cinematographer + storyboard artist. Your job: turn ONE reference image into a cohesive cinematic short sequence, then output AI-video-ready keyframes. </role>
<input> User provides: one reference image (image). </input>
<non-negotiable rules - continuity & truthfulness>
First, analyze the full composition: identify ALL key subjects (person/group/vehicle/object/animal/props/environment elements) and describe spatial relationships and interactions (left/right/foreground/background, facing direction, what each is doing).
Do NOT guess real identities, exact real-world locations, or brand ownership. Stick to visible facts. Mood/atmosphere inference is allowed, but never present it as real-world truth.
Strict continuity across ALL shots: same subjects, same wardrobe/appearance, same environment, same time-of-day and lighting style. Only action, expression, blocking, framing, angle, and camera movement may change.
Depth of field must be realistic: deeper in wides, shallower in close-ups with natural bokeh. Keep ONE consistent cinematic color grade across the entire sequence.
Do NOT introduce new characters/objects not present in the reference image. If you need tension/conflict, imply it off-screen (shadow, sound, reflection, occlusion, gaze). </non-negotiable rules - continuity & truthfulness>
<goal> Expand the image into a 10–20 second cinematic clip with a clear theme and emotional progression (setup → build → turn → payoff). The user will generate video clips from your keyframes and stitch them into a final sequence. </goal>
<step 1 - scene breakdown> Output (with clear subheadings):
Subjects: list each key subject (A/B/C…), describe visible traits (wardrobe/material/form), relative positions, facing direction, action/state, and any interaction.
Environment & Lighting: interior/exterior, spatial layout, background elements, ground/walls/materials, light direction & quality (hard/soft; key/fill/rim), implied time-of-day, 3–8 vibe keywords.
Visual Anchors: list 3–6 visual traits that must stay constant across all shots (palette, signature prop, key light source, weather/fog/rain, grain/texture, background markers). </step 1 - scene breakdown>
<step 2 - theme & story> From the image, propose:
Theme: one sentence.
Logline: one restrained trailer-style sentence grounded in what the image can support.
Emotional Arc: 4 beats (setup/build/turn/payoff), one line each. </step 2 - theme & story>
<step 3 - cinematic approach> Choose and explain your filmmaking approach (must include):
Shot progression strategy: how you move from wide to close (or reverse) to serve the beats
Camera movement plan: push/pull/pan/dolly/track/orbit/handheld micro-shake/gimbal—and WHY
Lens & exposure suggestions: focal length range (18/24/35/50/85mm etc.), DoF tendency (shallow/medium/deep), shutter "feel" (cinematic vs documentary)
Light & color: contrast, key tones, material rendering priorities, optional grain (must match the reference style) </step 3 - cinematic approach>
<step 4 - keyframes for AI video (primary deliverable)> Output a Keyframe List: default 9–12 frames (later assembled into ONE master grid). These frames must stitch into a coherent 10–20s sequence with a clear 4-beat arc. Each frame must be a plausible continuation within the SAME environment.
Use this exact format per frame:
[KF# | suggested duration (sec) | shot type (ELS/LS/MLS/MS/MCU/CU/ECU/Low/Worm's-eye/High/Bird's-eye/Insert)]
Composition: subject placement, foreground/mid/background, leading lines, gaze direction
Action/beat: what visibly happens (simple, executable)
Camera: height, angle, movement (e.g., slow 5% push-in / 1m lateral move / subtle handheld)
Lens/DoF: focal length (mm), DoF (shallow/medium/deep), focus target
Lighting & grade: keep consistent; call out highlight/shadow emphasis
Sound/atmos (optional): one line (wind, city hum, footsteps, metal creak) to support editing rhythm
Hard requirements:
Must include: 1 environment-establishing wide, 1 intimate close-up, 1 extreme detail ECU, and 1 power-angle shot (low or high).
Ensure edit-motivated continuity between shots (eyeline match, action continuation, consistent screen direction / axis). </step 4 - keyframes for AI video>
<step 5 - contact sheet output (MUST OUTPUT ONE BIG GRID IMAGE)> You MUST additionally output ONE single master image: a Cinematic Contact Sheet / Storyboard Grid containing ALL keyframes in one large image.
Default grid: 3x3. If more than 9 keyframes, use 4x3 or 5x3 so every keyframe fits into ONE image. Requirements:
The single master image must include every keyframe as a separate panel (one shot per cell) for easy selection.
Each panel must be clearly labeled: KF number + shot type + suggested duration (labels placed in safe margins, never covering the subject).
Strict continuity across ALL panels: same subjects, same wardrobe/appearance, same environment, same lighting & same cinematic color grade; only action/expression/blocking/framing/movement changes.
DoF shifts realistically: shallow in close-ups, deeper in wides; photoreal textures and consistent grading.
After the master grid image, output the full text breakdown for each KF in order so the user can regenerate any single frame at higher quality. </step 5 - contact sheet output>
<final output format> Output in this order: A) Scene Breakdown B) Theme & Story C) Cinematic Approach D) Keyframes (KF# list) E) ONE Master Contact Sheet Image (All KFs in one grid) </final output format>
Extract frame KF1`,

  version3: `Input your story here: [YOUR STORY SYNOPSIS]

STORY-TO-STORYBOARD META-PROMPT
IMPORTANT: Do not create the image, create the detailed prompt for the image.
The image prompt must make reference to the story and reference image provided by user, the prompt must follow exactly the details of the image prompt
When the user provides a short story synopsis, follow these steps:
Analyze the synopsis and identify:
The main subject(s) (person, pair, group, creature, vehicle, object)
Their appearance and defining traits
The environment and tone
The emotional or narrative beat
Lighting/mood implied by the story
Create a full 3×3 cinematic storyboard grid with 9 distinct shots of the same subject(s) in the same environment, using consistent wardrobe, lighting, and atmosphere.
Output a single cohesive AI image prompt that includes all 9 frames (labeled 1–9), using the following structure:
OUTPUT FORMAT
Cinematic 3×3 Storyboard Prompt
Story Synopsis (interpreted):
<one-sentence interpretation of the user's synopsis>
Create a professional 3×3 cinematic storyboard grid featuring the same subject(s) from the synopsis in the same environment.
Maintain total consistency in appearance, clothing, lighting, mood, and environmental details.
Each panel represents a distinct camera shot following cinematic conventions.
Row 1 — Establishing Context
Extreme Long Shot (ELS):
Full environment revealed, subject(s) small in frame. Match the story's setting, lighting, and mood.
Long Shot (LS):
Entire subject(s) visible head-to-toe (or full object/vehicle), standing naturally within the environment.
Medium Long Shot (MLS / 3-4 / American Shot):
Subject(s) framed from knees up (or 3/4 angle for objects), showing stance, posture, and core emotion.
Row 2 — Core Coverage
Medium Shot (MS):
Waist-up framing. Capture the key action, attitude, or emotional beat implied by the story.
Medium Close-Up (MCU):
Chest-up. Focus on emotion, expression, micro-interaction, or narrative tension.
Close-Up (CU):
Tight shot of the face (or front detail of an object). Cinematic depth of field, emotional clarity.
Row 3 — Details & Angles
Extreme Close-Up (ECU):
Macro detail: eyes, hands, symbolic object, texture, or a key story element.
Low Angle Shot (Worm's Eye):
Camera looking up at the subject(s) from below. Dramatic, heroic, or imposing based on the story's tone.
High Angle Shot (Bird's Eye):
Camera looking down from above. Spatial clarity, vulnerability, or overview of action.
Global Requirements
Same subject from image prompt(s) in all 9 frames
Same clothing, hairstyle, props, weapons, or accessories
Same lighting conditions and color grading
Consistent environment and weather
Correct realism and cinematic depth of field per shot
Photorealistic textures
Cinematic camera behavior and focal-length accuracy
Final Line (technical):
Extract the still x.y
(Where x.y refers to the grid coordinate or still number the user later requests.)`
};

interface ImageGenerationRequest {
  userId: string;
  model: string;
  prompt: string;
  width?: number;
  height?: number;
  title?: string;
  referenceImageUrl?: string;
  template?: string;
  masterAssetId?: string;
  masterSalesforceId?: string;
  salesforceData?: {
    title: string;
    description?: string;
    categories?: string[];
    tags?: string[];
  };
}

const WAVESPEED_IMAGE_MODELS: Record<string, {
  url: string;
  buildPayload: (params: any) => any;
}> = {
  'flux-schnell': {
    url: 'https://api.wavespeed.ai/api/v3/wavespeed-ai/flux-schnell',
    buildPayload: ({ prompt, width, height, seed }) => ({
      prompt,
      size: `${width}x${height}`,
      num_inference_steps: 4,
      seed: seed || -1,
      guidance_scale: 0,
      num_images: 1,
      enable_safety_checker: true
    })
  },
  'flux-dev': {
    url: 'https://api.wavespeed.ai/api/v3/flux/dev',
    buildPayload: ({ prompt, width, height, seed }) => ({
      prompt,
      size: `${width}x${height}`,
      num_inference_steps: 28,
      seed: seed || -1,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: true
    })
  }
};

// Helper function to escape special regex characters
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Query the wmc-content-master API to find a Salesforce ID by matching URL
async function findSalesforceIdByUrl(cdnUrl: string, maxAttempts = 3): Promise<string | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const delayMs = 2000 * attempt;
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      const apiUrl = `${WMC_CONTENT_API}?orgId=${ORG_ID}&sandbox=False`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) continue;
      
      const xmlText = await response.text();
      const escapedUrl = escapeRegExp(cdnUrl);
      
      const patterns = [
        new RegExp(`<content>.*?<id>([^<]+)</id>.*?<url><!\\[CDATA\\[${escapedUrl}\\]\\]></url>.*?</content>`, 's'),
        new RegExp(`<content>.*?<id>([^<]+)</id>.*?<url>${escapedUrl}</url>.*?</content>`, 's'),
        new RegExp(`<content>.*?<url><!\\[CDATA\\[${escapedUrl}\\]\\]></url>.*?<id>([^<]+)</id>.*?</content>`, 's'),
        new RegExp(`<content>.*?<url>${escapedUrl}</url>.*?<id>([^<]+)</id>.*?</content>`, 's'),
      ];
      
      for (const pattern of patterns) {
        const match = xmlText.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
      
      const contentBlocks = xmlText.match(/<content>[\s\S]*?<\/content>/g) || [];
      for (const block of contentBlocks) {
        if (block.includes(cdnUrl)) {
          const idMatch = block.match(/<id>([^<]+)<\/id>/);
          if (idMatch && idMatch[1]) {
            return idMatch[1].trim();
          }
        }
      }
    } catch (error) {
      console.error(`Error querying API (attempt ${attempt}):`, error);
    }
  }
  
  return null;
}

// Create SFDC record and get ID
async function createSfdcRecord(title: string, cdnUrl: string, contentType: string): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("retURL", "https://worldmotoclash.com");
    formData.append("sObj", "ri1__Content__c");
    formData.append("string_Name", title);
    formData.append("string_ri1__Content_Type__c", contentType);
    formData.append("string_ri1__URL__c", cdnUrl);

    console.log("Sending to w2x-engine:", W2X_ENGINE_URL);

    const sfResponse = await fetch(W2X_ENGINE_URL, {
      method: "POST",
      body: formData,
    });

    if (sfResponse.ok) {
      console.log("w2x-engine call successful, querying API for Salesforce ID...");
      return await findSalesforceIdByUrl(cdnUrl, 3);
    } else {
      console.error("w2x-engine call failed:", sfResponse.status);
      return null;
    }
  } catch (error) {
    console.error("SFDC sync error:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ImageGenerationRequest = await req.json();
    const { userId, model, prompt, width = 1024, height = 1024, title, referenceImageUrl, template, masterAssetId, masterSalesforceId, salesforceData } = body;

    const isGridTemplate = template && ['version1', 'version2', 'version3'].includes(template);

    if (!userId || !prompt) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: userId and prompt' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const modelConfig = WAVESPEED_IMAGE_MODELS[model];
    if (!modelConfig) {
      return new Response(
        JSON.stringify({ success: false, error: `Unknown model: ${model}. Supported: flux-schnell, flux-dev` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: genRecord, error: insertError } = await supabase
      .from('image_generations')
      .insert({
        user_id: userId,
        prompt,
        template,
        status: 'pending',
        progress: 0,
        generation_data: {
          model,
          vendor: 'Wavespeed',
          width,
          height,
          title,
          salesforceData,
          masterAssetId,
          masterSalesforceId,
          isGridTemplate
        }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating generation record:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to create generation record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const generationId = genRecord.id;
    console.log(`Created generation record: ${generationId}`);

    EdgeRuntime.waitUntil(generateImage(supabase, generationId, modelConfig, { 
      prompt, width, height, referenceImageUrl, title, template, masterAssetId, masterSalesforceId, isGridTemplate 
    }));

    return new Response(
      JSON.stringify({ success: true, generationId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-wavespeed-image:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function generateImage(
  supabase: any,
  generationId: string,
  modelConfig: { url: string; buildPayload: (params: any) => any },
  params: { 
    prompt: string; 
    width: number; 
    height: number; 
    referenceImageUrl?: string; 
    title?: string;
    template?: string;
    masterAssetId?: string;
    masterSalesforceId?: string;
    isGridTemplate: boolean;
  }
) {
  const wavespeedApiKey = Deno.env.get('WAVESPEED_API_KEY');
  
  if (!wavespeedApiKey) {
    console.error('WAVESPEED_API_KEY not configured');
    await supabase.from('image_generations').update({
      status: 'failed',
      error_message: 'WAVESPEED_API_KEY not configured'
    }).eq('id', generationId);
    return;
  }

  try {
    await supabase.from('image_generations').update({
      status: 'generating',
      progress: 10
    }).eq('id', generationId);

    // Build the full prompt using template definitions
    let fullPrompt = params.prompt;
    if (params.template && TEMPLATE_PROMPTS[params.template]) {
      fullPrompt = `${TEMPLATE_PROMPTS[params.template]}\n\nScene Description: ${params.prompt}`;
      console.log(`Using template "${params.template}" with full prompt text`);
    }

    // For grid templates, enhance the prompt with explicit no-text instruction
    if (params.isGridTemplate) {
      fullPrompt = `CRITICAL: Generate a SINGLE IMAGE containing exactly 9 panels arranged in a 3×3 grid layout. Each panel must be a distinct camera shot. All panels must maintain visual consistency.

CRITICAL: DO NOT include ANY text, titles, labels, captions, watermarks, scene numbers, shot type labels (like "KF7 Low Angle"), or text overlays of any kind in the generated image. The image must be PURELY VISUAL with absolutely no textual elements. Each panel should contain only the visual content - no annotations or descriptions embedded in the image.

${fullPrompt}`;
    } else {
      // Add no-text instruction for regular images too
      fullPrompt = `${fullPrompt}\n\nIMPORTANT: Do not include any text, watermarks, labels, or overlays in the generated image.`;
    }

    const payload = modelConfig.buildPayload({ ...params, prompt: fullPrompt });
    console.log(`Calling Wavespeed API at ${modelConfig.url}`);

    const response = await fetch(modelConfig.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${wavespeedApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Wavespeed API error:', response.status, errorText);
      throw new Error(`Wavespeed API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Wavespeed API response received');

    let imageUrl: string | null = null;

    if (result.data?.task_id) {
      console.log('Task ID received, polling for completion...');
      await supabase.from('image_generations').update({ progress: 30 }).eq('id', generationId);
      
      imageUrl = await pollForCompletion(wavespeedApiKey, result.data.task_id, supabase, generationId);
    } else if (result.data?.outputs?.[0]?.url) {
      imageUrl = result.data.outputs[0].url;
    } else if (result.data?.url) {
      imageUrl = result.data.url;
    } else {
      console.error('Unexpected response format:', result);
      throw new Error('Unexpected response format from Wavespeed API');
    }

    if (!imageUrl) {
      throw new Error('No image URL returned from Wavespeed API');
    }

    await supabase.from('image_generations').update({ progress: 80 }).eq('id', generationId);
    const s3Url = await uploadToWasabiS3(imageUrl, generationId);

    // === Create media_assets record ===
    const assetType = params.isGridTemplate ? 'generation_master' : 'generated_image';
    const { data: assetData, error: assetError } = await supabase
      .from('media_assets')
      .insert({
        title: params.title || `Generated Image - ${generationId}`,
        file_url: s3Url,
        thumbnail_url: s3Url,
        source: 'generated',
        status: 'ready',
        file_format: 'png',
        asset_type: assetType,
        master_id: params.masterAssetId || null,
        s3_key: `${S3_PATHS.GENERATION_INPUTS}/${generationId}.png`,
        metadata: {
          generationId,
          prompt: params.prompt.substring(0, 500),
          vendor: 'Wavespeed',
          template: params.template,
          isGridTemplate: params.isGridTemplate,
          masterAssetId: params.masterAssetId,
          masterSalesforceId: params.masterSalesforceId,
          createdAt: new Date().toISOString(),
          sfdcSyncStatus: 'pending',
        },
      })
      .select()
      .single();

    if (assetError) {
      console.error('Failed to create media asset:', assetError);
    } else {
      console.log('Created media_assets record:', assetData.id);
    }

    // === SALESFORCE SYNC ===
    let salesforceId: string | null = null;
    if (assetData?.id) {
      console.log('=== SALESFORCE SYNC START ===');
      salesforceId = await createSfdcRecord(params.title || `Generated Image`, s3Url, 'PNG');
      
      if (salesforceId) {
        await supabase
          .from('media_assets')
          .update({ 
            salesforce_id: salesforceId,
            metadata: {
              ...assetData.metadata,
              sfdcSyncStatus: 'success',
              sfdcSyncedAt: new Date().toISOString(),
            }
          })
          .eq('id', assetData.id);
        console.log('Updated with Salesforce ID:', salesforceId);
      }
      console.log('=== SALESFORCE SYNC END ===');
    }

    await supabase.from('image_generations').update({
      status: 'completed',
      progress: 100,
      image_url: s3Url
    }).eq('id', generationId);

    console.log(`Generation ${generationId} completed successfully`);

    // === AUTO-EXTRACT 9 GRID CELLS if 3x3 template ===
    if (params.isGridTemplate) {
      console.log('=== AUTO-EXTRACTING 9 GRID CELLS ===');
      await autoExtractGridCells(supabase, generationId, s3Url, params.template || 'grid', assetData?.id, salesforceId);
    }

  } catch (error) {
    console.error('Generation error:', error);
    await supabase.from('image_generations').update({
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error'
    }).eq('id', generationId);
  }
}

async function autoExtractGridCells(
  supabase: any,
  generationId: string,
  sourceUrl: string,
  template: string,
  masterAssetId: string | undefined,
  masterSalesforceId: string | null
) {
  const positions = [
    { row: 0, col: 0, id: 'top-left' },
    { row: 0, col: 1, id: 'top-center' },
    { row: 0, col: 2, id: 'top-right' },
    { row: 1, col: 0, id: 'middle-left' },
    { row: 1, col: 1, id: 'middle-center' },
    { row: 1, col: 2, id: 'middle-right' },
    { row: 2, col: 0, id: 'bottom-left' },
    { row: 2, col: 1, id: 'bottom-center' },
    { row: 2, col: 2, id: 'bottom-right' },
  ];

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  for (const pos of positions) {
    try {
      console.log(`Extracting grid cell ${pos.id} (${pos.row},${pos.col})...`);
      
      const extractResponse = await fetch(`${supabaseUrl}/functions/v1/extract-grid-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({
          sourceUrl,
          row: pos.row,
          col: pos.col,
          generationId,
          positionId: pos.id,
          template,
          masterAssetId,
          masterSalesforceId,
        }),
      });

      if (extractResponse.ok) {
        const result = await extractResponse.json();
        console.log(`Grid cell ${pos.id} extracted:`, result.assetId, result.salesforceId);
      } else {
        console.error(`Failed to extract ${pos.id}:`, await extractResponse.text());
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error extracting ${pos.id}:`, error);
    }
  }

  console.log('=== GRID EXTRACTION COMPLETE ===');
}

async function pollForCompletion(apiKey: string, taskId: string, supabase: any, generationId: string): Promise<string> {
  const maxAttempts = 60;
  const pollInterval = 2000;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    
    const statusUrl = `https://api.wavespeed.ai/api/v3/predictions/${taskId}/result`;
    const response = await fetch(statusUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    if (!response.ok) {
      console.error('Poll status error:', response.status);
      continue;
    }

    const result = await response.json();
    console.log(`Poll attempt ${attempt + 1}:`, result.data?.status);

    if (result.data?.status === 'completed') {
      const outputUrl = result.data.outputs?.[0]?.url || result.data.output?.url;
      if (outputUrl) {
        return outputUrl;
      }
      throw new Error('Completed but no output URL found');
    }

    if (result.data?.status === 'failed') {
      throw new Error(result.data.error || 'Generation failed on Wavespeed');
    }

    const progress = Math.min(30 + (attempt * 50 / maxAttempts), 75);
    await supabase.from('image_generations').update({ progress: Math.round(progress) }).eq('id', generationId);
  }

  throw new Error('Generation timed out');
}

async function uploadToWasabiS3(imageUrl: string, generationId: string): Promise<string> {
  console.log('Uploading image to Wasabi S3...');
  
  const s3Config = getS3Config();
  
  if (!s3Config.accessKeyId || !s3Config.secretAccessKey) {
    console.log('Wasabi credentials not configured, returning original URL');
    return imageUrl;
  }

  try {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/png';
    const extension = contentType.includes('jpeg') ? 'jpg' : 'png';

    const { bucketName, region } = s3Config;
    const host = `s3.${region}.wasabisys.com`;
    const key = `${S3_PATHS.GENERATION_INPUTS}/${generationId}.${extension}`;
    const url = `https://${host}/${bucketName}/${key}`;

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    const canonicalUri = `/${bucketName}/${key}`;
    const canonicalQueryString = '';
    const payloadHash = await sha256Hex(new Uint8Array(imageBuffer));
    
    const canonicalHeaders = 
      `content-type:${contentType}\n` +
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    
    const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = `PUT\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${await sha256Hex(new TextEncoder().encode(canonicalRequest))}`;
    
    const signingKey = await getSignatureKey(s3Config.secretAccessKey, dateStamp, region, 's3');
    const signature = await hmacSha256Hex(signingKey, stringToSign);
    
    const authorizationHeader = `${algorithm} Credential=${s3Config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const uploadResponse = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
        'Host': host,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
        'Authorization': authorizationHeader
      },
      body: imageBuffer
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('S3 upload failed:', uploadResponse.status, errorText);
      throw new Error(`S3 upload failed: ${uploadResponse.status}`);
    }

    const cdnUrl = getCdnUrl(key);
    console.log('Uploaded to S3, CDN URL:', cdnUrl);
    return cdnUrl;

  } catch (error) {
    console.error('S3 upload error:', error);
    return imageUrl;
  }
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(key: ArrayBuffer, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function hmacSha256Hex(key: ArrayBuffer, data: string): Promise<string> {
  const result = await hmacSha256(key, data);
  return Array.from(new Uint8Array(result))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getSignatureKey(key: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmacSha256(new TextEncoder().encode('AWS4' + key).buffer, dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  return await hmacSha256(kService, 'aws4_request');
}

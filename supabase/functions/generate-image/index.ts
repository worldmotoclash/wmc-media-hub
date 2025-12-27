import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";
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

interface StyleProfile {
  subjects?: Array<{
    id: string;
    type: string;
    appearance: string;
    wardrobe?: string;
    distinguishingTraits: string[];
    position: string;
  }>;
  environment?: {
    setting: string;
    timeOfDay: string;
    weather?: string;
    backgroundElements: string[];
  };
  lighting?: {
    direction: string;
    quality: string;
    keyTones: string[];
  };
  colorGrade?: {
    palette: string[];
    mood: string;
    contrast: string;
    texture: string;
  };
  cameraStyle?: {
    lensType: string;
    depthOfField: string;
    compositionNotes: string;
  };
  visualAnchors?: string[];
  negativeConstraints?: string[];
}

// Pinned subject reference for element locking
interface PinnedSubject {
  subjectId: string;
  imageUrl: string;
  profile?: Partial<StyleProfile>;
}

interface ImageGenerationRequest {
  userId: string;
  prompt: string;
  template?: string;
  referenceImageUrl?: string;
  title: string;
  model?: string;
  masterAssetId?: string;
  masterSalesforceId?: string;
  styleProfile?: StyleProfile;
  styleOverride?: string;
  pinnedSubjects?: PinnedSubject[]; // New: for element locking
  salesforceData?: {
    title: string;
    description?: string;
    categories?: string[];
    tags?: string[];
  };
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

// Interface for SFDC metadata
interface SfdcImageMetadata {
  prompt?: string;
  referenceImageUrl?: string;
  generationId?: string;
  description?: string;
  aspectRatio?: string;
  template?: string;
  masterSalesforceId?: string;
  modelVendor?: string;
  modelUsed?: string;
}

// Create SFDC record and get ID with comprehensive AI generation fields
async function createSfdcRecord(
  title: string, 
  cdnUrl: string, 
  contentType: string,
  metadata?: SfdcImageMetadata
): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append("retURL", "https://worldmotoclash.com");
    formData.append("sObj", "ri1__Content__c");
    formData.append("string_Name", title);
    formData.append("string_ri1__Content_Type__c", contentType);
    formData.append("string_ri1__URL__c", cdnUrl);
    
    // AI Generation Fields
    if (metadata?.prompt) {
      // Truncate prompt to 32768 chars (Long Text Area limit)
      formData.append("string_ri1__AI_Prompt__c", metadata.prompt.substring(0, 32768));
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
    if (metadata?.modelVendor) {
      formData.append("string_ri1__AI_Models_Vendors__c", metadata.modelVendor.substring(0, 255));
    }
    if (metadata?.modelUsed) {
      formData.append("string_ri1__AI_Model_Used__c", metadata.modelUsed.substring(0, 255));
    }

    console.log("Sending to w2x-engine:", W2X_ENGINE_URL);
    console.log("SFDC metadata fields:", {
      hasPrompt: !!metadata?.prompt,
      hasRefImage: !!metadata?.referenceImageUrl,
      hasGenId: !!metadata?.generationId,
      hasMaster: !!metadata?.masterSalesforceId,
      hasModelVendor: !!metadata?.modelVendor,
      hasModelUsed: !!metadata?.modelUsed,
    });

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
    const requestData: ImageGenerationRequest = await req.json();
    const { userId, prompt, template, referenceImageUrl, title, model, masterAssetId, masterSalesforceId, styleProfile, styleOverride, pinnedSubjects, salesforceData } = requestData;

    const selectedModel = model || 'google/gemini-2.5-flash-image-preview';
    const isGridTemplate = template && ['version1', 'version2', 'version3'].includes(template);

    console.log('Image generation request received:', { userId, prompt: prompt.substring(0, 100), template, title, model: selectedModel, isGridTemplate, hasStyleProfile: !!styleProfile, pinnedSubjectsCount: pinnedSubjects?.length || 0 });

    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: generation, error: insertError } = await supabase
      .from('image_generations')
      .insert({
        user_id: userId,
        prompt,
        template,
        reference_image_url: referenceImageUrl,
        status: 'pending',
        progress: 0,
        generation_data: { title, model: selectedModel, salesforceData, masterAssetId, masterSalesforceId, isGridTemplate, hasStyleProfile: !!styleProfile }
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating generation record:', insertError);
      throw new Error('Failed to create generation record');
    }

    console.log('Created generation record:', generation.id);

    const generationPromise = generateImage(
      supabase,
      generation.id,
      prompt,
      template,
      referenceImageUrl,
      selectedModel,
      LOVABLE_API_KEY,
      title,
      masterAssetId,
      masterSalesforceId,
      isGridTemplate,
      styleProfile,
      styleOverride,
      pinnedSubjects
    );

    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      EdgeRuntime.waitUntil(generationPromise);
    } else {
      generationPromise.catch(console.error);
    }

    return new Response(JSON.stringify({
      success: true,
      generationId: generation.id,
      message: 'Image generation started'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-image function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateImage(
  supabase: any,
  generationId: string,
  prompt: string,
  template: string | undefined,
  referenceImageUrl: string | undefined,
  model: string,
  apiKey: string,
  title: string,
  masterAssetId: string | undefined,
  masterSalesforceId: string | undefined,
  isGridTemplate: boolean,
  styleProfile?: StyleProfile,
  styleOverride?: string,
  pinnedSubjects?: PinnedSubject[]
) {
  try {
    await supabase
      .from('image_generations')
      .update({ status: 'generating', progress: 10 })
      .eq('id', generationId);

    console.log('Starting image generation with Lovable AI...');

    // Build the full prompt using template definitions
    let fullPrompt = prompt;
    if (template && TEMPLATE_PROMPTS[template]) {
      fullPrompt = `${TEMPLATE_PROMPTS[template]}\n\nScene Description: ${prompt}`;
      console.log(`Using template "${template}" with full prompt text`);
    }

    // Build style lock constraints if styleProfile is provided
    let styleLockConstraints = '';
    if (styleProfile && isGridTemplate) {
      const subjectsList = styleProfile.subjects?.map(s => 
        `- ${s.id} (${s.type}): ${s.appearance}${s.wardrobe ? `, wearing ${s.wardrobe}` : ''}`
      ).join('\n') || '';
      
      const anchorsList = styleProfile.visualAnchors?.map(a => `- ${a}`).join('\n') || '';
      const negativeList = styleProfile.negativeConstraints?.map(n => `- ${n}`).join('\n') || '';
      
      styleLockConstraints = `
=== STYLE LOCK CONSTRAINTS (MANDATORY) ===
You MUST maintain EXACT consistency with the master image. These are non-negotiable requirements:

SUBJECTS (use ONLY these - do NOT add new characters/objects):
${subjectsList}

ENVIRONMENT: ${styleProfile.environment?.setting || 'as shown in reference'}, ${styleProfile.environment?.timeOfDay || ''} lighting
LIGHTING: ${styleProfile.lighting?.direction || ''} ${styleProfile.lighting?.quality || ''} light with ${styleProfile.lighting?.keyTones?.join(', ') || 'natural'} tones
COLOR GRADE: ${styleProfile.colorGrade?.mood || ''} mood, ${styleProfile.colorGrade?.contrast || 'medium'} contrast

VISUAL ANCHORS (MUST remain constant in ALL panels):
${anchorsList}

NEGATIVE CONSTRAINTS (NEVER do these):
${negativeList}
- Do NOT introduce new characters, objects, or props not in the master
- Do NOT change wardrobe, colors, or distinguishing features
- Do NOT add text, labels, watermarks, or overlays

${styleOverride ? `ADDITIONAL USER CONSTRAINTS:\n${styleOverride}` : ''}

Only vary: camera angle, shot framing, and shot distance. Everything else MUST match the master exactly.
=== END STYLE LOCK ===
`;
      console.log('Style lock constraints applied');
    }

    // Add pinned subject constraints if any subjects have reference images
    let pinnedSubjectsConstraints = '';
    if (pinnedSubjects && pinnedSubjects.length > 0 && isGridTemplate) {
      const pinnedList = pinnedSubjects.map(ps => {
        const profileDetails = ps.profile?.subjects?.[0];
        return `- "${ps.subjectId}": MUST EXACTLY MATCH the pinned reference image. ${profileDetails?.appearance || ''} ${profileDetails?.wardrobe ? `Wearing: ${profileDetails.wardrobe}` : ''}`;
      }).join('\n');
      
      pinnedSubjectsConstraints = `
=== PINNED ELEMENT REFERENCES (HIGHEST PRIORITY) ===
The following elements have specific reference images and MUST be reproduced EXACTLY as shown:
${pinnedList}

These pinned elements take precedence over general style lock constraints.
=== END PINNED ELEMENTS ===
`;
      console.log(`Applied ${pinnedSubjects.length} pinned subject constraints`);
    }

    // Combine all constraints
    const allConstraints = styleLockConstraints + pinnedSubjectsConstraints;

    // Enhanced system prompt for grid templates
    const systemPrompt = isGridTemplate 
      ? `You are generating a 3×3 cinematic storyboard grid image.
CRITICAL REQUIREMENT: You MUST output a SINGLE IMAGE containing exactly 9 panels arranged in a 3×3 grid layout.
Each panel should be a distinct camera shot following the template instructions.
All 9 panels must maintain strict visual consistency: same subjects, same wardrobe, same environment, same lighting.
The only differences between panels should be camera angle, framing, and shot type.
Generate ONE composite image with all 9 panels visible in a grid arrangement.

CRITICAL: DO NOT include ANY text, titles, labels, captions, watermarks, scene numbers, shot type labels (like "KF7 Low Angle"), 
or text overlays of any kind in the generated image. The image must be PURELY VISUAL with absolutely no textual elements.
Each panel should contain only the visual content - no annotations or descriptions embedded in the image.

${allConstraints}`
      : `You are generating professional motorsport and racing imagery. 
Create high-quality, cinematic images suitable for marketing and promotional use.
Focus on dynamic action, dramatic lighting, and professional sports photography aesthetics.
The images should capture the excitement and intensity of motorcycle racing.
DO NOT include any text, watermarks, labels, or overlays in the generated images.`;

    const messages: any[] = [
      { role: "system", content: systemPrompt }
    ];

    if (referenceImageUrl) {
      const userPrompt = isGridTemplate
        ? `Based on this reference image, generate a 3×3 grid storyboard with 9 distinct cinematic shots.\n\n${fullPrompt}`
        : `Use this reference image as inspiration for style and composition: ${fullPrompt}`;
      
      messages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: userPrompt
          },
          {
            type: "image_url",
            image_url: { url: referenceImageUrl }
          }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: fullPrompt
      });
    }

    await supabase
      .from('image_generations')
      .update({ progress: 30 })
      .eq('id', generationId);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages,
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (response.status === 402) {
        throw new Error('Payment required. Please add credits to your workspace.');
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Lovable AI response received');

    await supabase
      .from('image_generations')
      .update({ progress: 60 })
      .eq('id', generationId);

    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!imageUrl) {
      console.error('No image in response:', JSON.stringify(data).substring(0, 500));
      throw new Error('No image generated from AI response');
    }

    console.log('Image generated successfully, uploading to S3...');

    const s3Url = await uploadToWasabiS3(imageUrl, generationId);

    console.log('Image uploaded to S3:', s3Url);

    // === Create media_assets record ===
    const assetType = isGridTemplate ? 'generation_master' : 'generated_image';
    const { data: assetData, error: assetError } = await supabase
      .from('media_assets')
      .insert({
        title: title || `Generated Image - ${generationId}`,
        file_url: s3Url,
        thumbnail_url: s3Url,
        source: 'generated',
        status: 'ready',
        file_format: 'png',
        asset_type: assetType,
        master_id: masterAssetId || null,
        s3_key: `${S3_PATHS.GENERATION_OUTPUTS}/${generationId}.png`,
        metadata: {
          generationId,
          prompt: prompt.substring(0, 500),
          model,
          template,
          isGridTemplate,
          masterAssetId,
          masterSalesforceId,
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

    // === SALESFORCE SYNC for generated image ===
    let salesforceId: string | null = null;
    if (assetData?.id) {
      console.log('=== SALESFORCE SYNC START ===');
      salesforceId = await createSfdcRecord(title || `Generated Image`, s3Url, 'PNG', {
        prompt: fullPrompt,
        referenceImageUrl,
        generationId,
        aspectRatio: '1:1',
        template,
        masterSalesforceId,
        modelVendor: 'Google',
        modelUsed: 'gemini-2.5-flash-image-preview',
      });
      
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

    await supabase
      .from('image_generations')
      .update({
        status: 'completed',
        progress: 100,
        image_url: s3Url,
        updated_at: new Date().toISOString()
      })
      .eq('id', generationId);

    console.log('Image generation completed successfully');

    // === AUTO-EXTRACT 9 GRID CELLS if 3x3 template ===
    if (isGridTemplate) {
      console.log('=== AUTO-EXTRACTING 9 GRID CELLS ===');
      // Use the reference image's masterAssetId/masterSalesforceId if provided,
      // otherwise fall back to the grid image itself as master
      const extractMasterAssetId = masterAssetId || assetData?.id;
      const extractMasterSalesforceId = masterSalesforceId || salesforceId;
      console.log('Grid extraction master context:', { extractMasterAssetId, extractMasterSalesforceId, originalMasterAssetId: masterAssetId, originalMasterSalesforceId: masterSalesforceId });
      await autoExtractGridCells(supabase, generationId, s3Url, template || 'grid', extractMasterAssetId, extractMasterSalesforceId, fullPrompt, referenceImageUrl, 'Google', 'gemini-2.5-flash-image-preview');
    }

  } catch (error) {
    console.error('Error during image generation:', error);
    
    await supabase
      .from('image_generations')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        updated_at: new Date().toISOString()
      })
      .eq('id', generationId);
  }
}

async function autoExtractGridCells(
  supabase: any,
  generationId: string,
  sourceUrl: string,
  template: string,
  masterAssetId: string | undefined,
  masterSalesforceId: string | null,
  prompt?: string,
  referenceImageUrl?: string,
  modelVendor?: string,
  modelUsed?: string
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
          prompt,
          referenceImageUrl,
          modelVendor,
          modelUsed,
        }),
      });

      if (extractResponse.ok) {
        const result = await extractResponse.json();
        console.log(`Grid cell ${pos.id} extracted:`, result.assetId, result.salesforceId);
      } else {
        console.error(`Failed to extract ${pos.id}:`, await extractResponse.text());
      }

      // Small delay between extractions
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error extracting ${pos.id}:`, error);
    }
  }

  console.log('=== GRID EXTRACTION COMPLETE ===');
}

async function uploadToWasabiS3(base64DataUrl: string, generationId: string): Promise<string> {
  const s3Config = getS3Config();
  
  if (!s3Config.accessKeyId || !s3Config.secretAccessKey) {
    throw new Error('Wasabi S3 credentials not configured');
  }

  const base64Match = base64DataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!base64Match) {
    throw new Error('Invalid base64 image data');
  }

  const imageFormat = base64Match[1];
  const base64Data = base64Match[2];
  
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const { bucketName, region, endpoint } = s3Config;
  const host = `s3.${region}.wasabisys.com`;
  const s3Key = `${S3_PATHS.GENERATION_OUTPUTS}/${generationId}.${imageFormat}`;
  
  const contentType = `image/${imageFormat}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.substring(0, 8);

  const method = 'PUT';
  const canonicalUri = `/${bucketName}/${s3Key}`;
  const canonicalQuerystring = '';
  
  const payloadHash = await sha256Hex(bytes);
  
  const canonicalHeaders = 
    `content-type:${contentType}\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date';
  
  const canonicalRequest = 
    `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
  
  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const canonicalRequestHash = await sha256Hex(new TextEncoder().encode(canonicalRequest));
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;
  
  const signingKey = await getSignatureKey(s3Config.secretAccessKey, dateStamp, region, 's3');
  const signature = await hmacSha256Hex(signingKey, stringToSign);
  
  const authorizationHeader = 
    `${algorithm} Credential=${s3Config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const uploadUrl = `https://${host}${canonicalUri}`;
  
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'Authorization': authorizationHeader,
    },
    body: bytes,
  });

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    console.error('S3 upload error:', uploadResponse.status, errorText);
    throw new Error(`Failed to upload to S3: ${uploadResponse.status}`);
  }

  return getCdnUrl(s3Key);
}

async function sha256Hex(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSha256(key: Uint8Array, message: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return new Uint8Array(signature);
}

async function hmacSha256Hex(key: Uint8Array, message: string): Promise<string> {
  const signature = await hmacSha256(key, message);
  return Array.from(signature)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<Uint8Array> {
  const kDate = await hmacSha256(new TextEncoder().encode(`AWS4${secretKey}`), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, service);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
}

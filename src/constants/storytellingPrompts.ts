export interface StorytellingPrompt {
  id: string;
  name: string;
  description: string;
  template: string;
  category: 'foundational' | 'contact-sheet' | 'storyboard' | 'meta-prompt';
  requiresImage: boolean;
}

export const STORYTELLING_PROMPTS: StorytellingPrompt[] = [
  {
    id: 'foundational',
    name: 'Foundational Image Prompt',
    description: 'Ultra-realistic cinematic portrait template',
    category: 'foundational',
    requiresImage: false,
    template: `Ultra-realistic waist-up cinematic portrait of [CHARACTER] in [ENVIRONMENT].
Wearing [OUTFIT DETAILS] with [ACCESSORIES].
[AGE / ETHNICITY / FEATURES], natural skin texture and subtle imperfections.
Facing the camera with an intentional expression.
Cinematic lighting with clear key light and rim separation.
Shot on [LENS TYPE], shallow depth, softly blurred background.
Film-inspired color grade, high dynamic range, subtle grain.
Grounded realism, accurate proportions, no distortion.`
  },
  {
    id: 'version1',
    name: 'Version 1 - Contact Sheet',
    description: '3x3 cinematic shot grid with 9 camera angles',
    category: 'contact-sheet',
    requiresImage: true,
    template: `<instruction> Analyze the entire composition of the input image. Identify ALL key subjects present (whether it's a single person, a group/couple, a vehicle, or a specific object) and their spatial relationship/interaction.
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
extract the still x.y`
  },
  {
    id: 'version3',
    name: 'Version 2 - Story-to-Storyboard',
    description: 'Convert story synopsis to cinematic storyboard',
    category: 'meta-prompt',
    requiresImage: true,
    template: `Input your story here: [YOUR STORY SYNOPSIS]

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
  },
  {
    id: 'version2',
    name: 'Version 3 - Storyboard Director',
    description: 'Full cinematic sequence with keyframes',
    category: 'storyboard',
    requiresImage: true,
    template: `<role> You are an award-winning trailer director + cinematographer + storyboard artist. Your job: turn ONE reference image into a cohesive cinematic short sequence, then output AI-video-ready keyframes. </role>
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
Extract frame KF1`
  }
];

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StyleProfile {
  subjects: Array<{
    id: string;
    type: 'person' | 'vehicle' | 'animal' | 'object' | 'group';
    appearance: string;
    wardrobe?: string;
    distinguishingTraits: string[];
    position: string;
  }>;
  environment: {
    setting: string;
    timeOfDay: string;
    weather?: string;
    backgroundElements: string[];
  };
  lighting: {
    direction: string;
    quality: string;
    keyTones: string[];
  };
  colorGrade: {
    palette: string[];
    mood: string;
    contrast: string;
    texture: string;
  };
  cameraStyle: {
    lensType: string;
    depthOfField: string;
    compositionNotes: string;
  };
  visualAnchors: string[];
  negativeConstraints: string[];
}

interface AnalyzeRequest {
  imageUrl: string;
  assetId?: string;
  // Element-focused analysis - for pinning specific subjects
  elementType?: 'character' | 'vehicle' | 'object' | 'scene' | 'group';
  elementDescription?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: AnalyzeRequest = await req.json();
    const { imageUrl, assetId, elementType, elementDescription } = requestData;

    console.log('Analyze master image request:', { imageUrl: imageUrl?.substring(0, 100), assetId, elementType, elementDescription });

    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Calling Lovable AI to analyze master image...');

    // Build system prompt based on whether this is element-focused or full analysis
    const isElementFocused = !!elementType;
    
    const fullAnalysisSystemPrompt = `You are a cinematic style analyst. Analyze images to extract a comprehensive "Style Profile" that can be used to maintain consistency when generating variant images.

CRITICAL RULE FOR SUBJECT DETECTION:
- ALWAYS detect people/characters SEPARATELY from vehicles they ride or operate
- If someone is riding a motorcycle, list the RIDER as a "person" subject AND the MOTORCYCLE as a separate "vehicle" subject
- If Santa is on a trike, detect "Santa" as a person AND "Santa's trike" as a separate vehicle
- Named/recognizable characters (Santa, celebrities, mascots) should use their name as the subject ID
- Generic people should be labeled descriptively (e.g., "Rider in blue helmet", "Spectator with red shirt")

Focus on extracting:
1. ALL subjects (people, vehicles, animals, objects) with detailed descriptions - remember to separate riders from vehicles!
2. Their exact appearance, wardrobe, colors, textures
3. The environment, setting, time of day, weather
4. Lighting direction, quality, and tone
5. Color palette and overall grade/mood
6. Camera/lens characteristics
7. "Visual Anchors" - 4-8 specific traits that MUST remain constant in any variants
8. "Negative Constraints" - things that should NOT appear in variants (like new characters, different props, etc.)

Be extremely specific and detailed. This profile will be used to ensure generated variants match the original exactly.`;

    const elementFocusedSystemPrompt = `You are a cinematic style analyst specializing in extracting details about specific elements from images.
You are analyzing a reference image specifically for a ${elementType || 'element'} ${elementDescription ? `named "${elementDescription}"` : ''}.

Focus ONLY on extracting details about this specific ${elementType || 'element'}:
1. Exact appearance, colors, textures, materials
2. Distinctive traits that make this element recognizable
3. For characters/people: exact wardrobe, accessories, physical features
4. For vehicles: make, model, color, modifications, identifying marks
5. For objects: shape, color, texture, size relative to surroundings
6. For scenes: key environmental elements that define this location

Be extremely specific and detailed. This profile will be used to ensure this exact ${elementType || 'element'} appears consistently across all generated variants.`;

    const fullAnalysisUserPrompt = 'Analyze this master image and extract a detailed Style Profile. Be extremely specific about all subjects, their appearance, wardrobe, the environment, lighting, and camera style. List visual anchors that must stay constant and negative constraints for what should not change.';

    const elementFocusedUserPrompt = `Analyze this image and extract detailed information specifically about the ${elementType || 'element'} ${elementDescription ? `"${elementDescription}"` : ''}. Focus only on this specific element's appearance, traits, and distinguishing features that must remain constant when generating variants.`;

    // Use tool calling to get structured output
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: isElementFocused ? elementFocusedSystemPrompt : fullAnalysisSystemPrompt
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: isElementFocused ? elementFocusedUserPrompt : fullAnalysisUserPrompt
              },
              {
                type: 'image_url',
                image_url: { url: imageUrl }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_style_profile',
              description: 'Extract a detailed style profile from the analyzed image',
              parameters: {
                type: 'object',
                properties: {
                  subjects: {
                    type: 'array',
                    description: 'All key subjects in the image',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', description: 'Identifier like A, B, C or descriptive name' },
                        type: { type: 'string', enum: ['person', 'vehicle', 'animal', 'object', 'group'] },
                        appearance: { type: 'string', description: 'Detailed appearance description' },
                        wardrobe: { type: 'string', description: 'Clothing/covering details if applicable' },
                        distinguishingTraits: { 
                          type: 'array', 
                          items: { type: 'string' },
                          description: 'Key visual traits that identify this subject'
                        },
                        position: { type: 'string', description: 'Position in frame (left, center, right, foreground, background)' }
                      },
                      required: ['id', 'type', 'appearance', 'distinguishingTraits', 'position']
                    }
                  },
                  environment: {
                    type: 'object',
                    properties: {
                      setting: { type: 'string', description: 'The location/setting description' },
                      timeOfDay: { type: 'string', description: 'Time of day (dawn, morning, noon, afternoon, dusk, night)' },
                      weather: { type: 'string', description: 'Weather conditions if visible' },
                      backgroundElements: { 
                        type: 'array', 
                        items: { type: 'string' },
                        description: 'Key background elements'
                      }
                    },
                    required: ['setting', 'timeOfDay', 'backgroundElements']
                  },
                  lighting: {
                    type: 'object',
                    properties: {
                      direction: { type: 'string', description: 'Light direction (front, side, back, overhead, etc.)' },
                      quality: { type: 'string', description: 'Light quality (hard, soft, diffused, dramatic)' },
                      keyTones: { 
                        type: 'array', 
                        items: { type: 'string' },
                        description: 'Key tonal qualities (warm, cool, golden hour, etc.)'
                      }
                    },
                    required: ['direction', 'quality', 'keyTones']
                  },
                  colorGrade: {
                    type: 'object',
                    properties: {
                      palette: { 
                        type: 'array', 
                        items: { type: 'string' },
                        description: 'Dominant colors in the image'
                      },
                      mood: { type: 'string', description: 'Overall mood/atmosphere' },
                      contrast: { type: 'string', description: 'Contrast level (low, medium, high)' },
                      texture: { type: 'string', description: 'Texture quality (smooth, grainy, film-like)' }
                    },
                    required: ['palette', 'mood', 'contrast', 'texture']
                  },
                  cameraStyle: {
                    type: 'object',
                    properties: {
                      lensType: { type: 'string', description: 'Apparent lens type (wide, standard, telephoto)' },
                      depthOfField: { type: 'string', description: 'DOF characteristic (shallow, medium, deep)' },
                      compositionNotes: { type: 'string', description: 'Composition style notes' }
                    },
                    required: ['lensType', 'depthOfField', 'compositionNotes']
                  },
                  visualAnchors: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '4-8 specific visual traits that MUST remain constant in all variants'
                  },
                  negativeConstraints: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Things that should NOT appear in variants (e.g., "no new characters", "no text overlays")'
                  }
                },
                required: ['subjects', 'environment', 'lighting', 'colorGrade', 'cameraStyle', 'visualAnchors', 'negativeConstraints']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'extract_style_profile' } }
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

    // Extract the tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'extract_style_profile') {
      console.error('No style profile extracted:', JSON.stringify(data).substring(0, 500));
      throw new Error('Failed to extract style profile from image');
    }

    let styleProfile: StyleProfile;
    try {
      styleProfile = JSON.parse(toolCall.function.arguments);
    } catch (parseError) {
      console.error('Failed to parse style profile:', toolCall.function.arguments);
      throw new Error('Failed to parse style profile response');
    }

    console.log('Style profile extracted:', {
      subjectsCount: styleProfile.subjects?.length,
      visualAnchorsCount: styleProfile.visualAnchors?.length,
      negativeConstraintsCount: styleProfile.negativeConstraints?.length
    });

    // If assetId provided, update the media_assets metadata with the style profile
    if (assetId) {
      console.log('Updating media_assets with style profile for:', assetId);
      
      const { data: existingAsset, error: fetchError } = await supabase
        .from('media_assets')
        .select('metadata')
        .eq('id', assetId)
        .single();

      if (fetchError) {
        console.error('Failed to fetch existing asset:', fetchError);
      } else {
        const existingMetadata = existingAsset?.metadata || {};
        const updatedMetadata = {
          ...existingMetadata,
          styleProfile,
          styleProfileAnalyzedAt: new Date().toISOString()
        };

        const { error: updateError } = await supabase
          .from('media_assets')
          .update({ metadata: updatedMetadata })
          .eq('id', assetId);

        if (updateError) {
          console.error('Failed to update asset with style profile:', updateError);
        } else {
          console.log('Successfully saved style profile to media_assets');
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      styleProfile,
      message: 'Style profile extracted successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-master-image function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Predefined tag categories for matching
const SCENE_TAGS = ['racetrack', 'podium', 'pit-lane', 'starting-grid', 'victory-lane', 'paddock', 'grandstand', 'chicane', 'straight', 'corner'];
const MOOD_TAGS = ['intense', 'celebratory', 'dramatic', 'action-packed', 'triumphant', 'competitive', 'exciting', 'suspenseful'];
const ENERGY_TAGS = ['high-energy', 'dynamic', 'fast-paced', 'explosive', 'powerful', 'aggressive'];
const USE_CASE_TAGS = ['social-media', 'highlight-reel', 'promotional', 'documentary', 'behind-the-scenes', 'interview', 'race-recap'];

interface AnalyzeRequest {
  videoData?: string; // base64 encoded video frame/thumbnail
  fileName: string;
  mediaType?: 'image' | 'video';
}

interface AIAnalysisResult {
  scene: string;
  mood: string;
  energy: string;
  use_cases: string[];
  objects: string[];
  description: string;
  confidence: number;
}

async function performAIAnalysis(
  videoData: string,
  fileName: string,
  apiKey: string
): Promise<AIAnalysisResult> {
  const systemPrompt = `You are an expert media analyst specializing in motorsports and racing content. 
Analyze the provided media and return a JSON object with the following structure:
{
  "scene": "one of: racetrack, podium, pit-lane, starting-grid, victory-lane, paddock, grandstand, chicane, straight, corner, or other descriptive term",
  "mood": "one of: intense, celebratory, dramatic, action-packed, triumphant, competitive, exciting, suspenseful",
  "energy": "one of: high-energy, dynamic, fast-paced, explosive, powerful, aggressive, calm, steady",
  "use_cases": ["array of suggested uses like: social-media, highlight-reel, promotional, documentary, behind-the-scenes"],
  "objects": ["array of key objects/subjects detected like: motorcycle, race-car, helmet, rider, crowd, trophy"],
  "description": "A concise 2-3 sentence description suitable for the media asset",
  "confidence": 0.85
}

Be accurate and specific to motorsports/racing content. The confidence should reflect how certain you are about the analysis (0.0 to 1.0).`;

  const userPrompt = `Analyze this media file named "${fileName}" and provide detailed tagging information for a motorsports media library.`;

  const messages: any[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: [
        { type: "text", text: userPrompt },
        {
          type: "image_url",
          image_url: {
            url: videoData.startsWith('data:') ? videoData : `data:image/jpeg;base64,${videoData}`
          }
        }
      ]
    }
  ];

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("AI Gateway error:", response.status, errorText);
    throw new Error(`AI analysis failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in AI response");
  }

  // Parse JSON from the response
  try {
    // Try to extract JSON from the response (it might be wrapped in markdown)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(content);
  } catch (parseError) {
    console.error("Failed to parse AI response:", content);
    // Return a default structure if parsing fails
    return {
      scene: "unknown",
      mood: "neutral",
      energy: "moderate",
      use_cases: ["general"],
      objects: [],
      description: "Media asset awaiting manual review.",
      confidence: 0.3
    };
  }
}

function extractTagsFromAnalysis(analysis: AIAnalysisResult): string[] {
  const tags: string[] = [];

  // Add scene tag if it matches known tags
  if (analysis.scene) {
    const sceneLower = analysis.scene.toLowerCase();
    const matchedScene = SCENE_TAGS.find(t => sceneLower.includes(t));
    if (matchedScene) {
      tags.push(matchedScene);
    } else if (!['unknown', 'other'].includes(sceneLower)) {
      tags.push(analysis.scene.toLowerCase().replace(/\s+/g, '-'));
    }
  }

  // Add mood tag if it matches known tags
  if (analysis.mood) {
    const moodLower = analysis.mood.toLowerCase();
    const matchedMood = MOOD_TAGS.find(t => moodLower.includes(t));
    if (matchedMood) {
      tags.push(matchedMood);
    }
  }

  // Add energy tag if it matches known tags
  if (analysis.energy) {
    const energyLower = analysis.energy.toLowerCase();
    const matchedEnergy = ENERGY_TAGS.find(t => energyLower.includes(t));
    if (matchedEnergy) {
      tags.push(matchedEnergy);
    }
  }

  // Add use case tags
  if (analysis.use_cases && Array.isArray(analysis.use_cases)) {
    for (const useCase of analysis.use_cases.slice(0, 3)) {
      const useCaseLower = useCase.toLowerCase().replace(/\s+/g, '-');
      if (USE_CASE_TAGS.includes(useCaseLower)) {
        tags.push(useCaseLower);
      }
    }
  }

  // Add object tags (limit to 5)
  if (analysis.objects && Array.isArray(analysis.objects)) {
    for (const obj of analysis.objects.slice(0, 5)) {
      const objTag = obj.toLowerCase().replace(/\s+/g, '-');
      if (objTag.length > 2 && objTag.length < 30) {
        tags.push(objTag);
      }
    }
  }

  // Remove duplicates
  return [...new Set(tags)];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { videoData, fileName, mediaType = 'video' } = await req.json() as AnalyzeRequest;

    if (!videoData) {
      return new Response(
        JSON.stringify({ success: false, error: 'No video data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!fileName) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file name provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get API key
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔍 Analyzing ${mediaType}: ${fileName}`);

    // Perform AI analysis
    const analysis = await performAIAnalysis(videoData, fileName, apiKey);
    console.log('AI Analysis result:', analysis);

    // Extract tags from analysis
    const tags = extractTagsFromAnalysis(analysis);
    console.log('Extracted tags:', tags);

    const processingTime = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        tags,
        description: analysis.description,
        scene: analysis.scene,
        mood: analysis.mood,
        energy: analysis.energy,
        use_cases: analysis.use_cases,
        objects: analysis.objects,
        confidence: analysis.confidence,
        processingTime
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Analyze video preview error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

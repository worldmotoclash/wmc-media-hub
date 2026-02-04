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
  videoData?: string; // base64 encoded video frame/thumbnail (null for audio)
  fileName: string;
  mediaType?: 'image' | 'video' | 'audio';
  isPodcast?: boolean;
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

// Audio-specific analysis categories
const AUDIO_SCENE_TAGS = ['podcast', 'interview', 'commentary', 'sound-effect', 'music', 'ambient', 'announcement'];
const AUDIO_MOOD_TAGS = ['informative', 'inspirational', 'intense', 'relaxed', 'conversational', 'dramatic', 'energetic'];

interface AudioAnalysisResult {
  tags: string[];
  description: string;
  scene: string;
  mood: string;
  use_cases: string[];
  confidence: number;
}

async function performAudioAnalysis(
  fileName: string,
  apiKey: string,
  isPodcast?: boolean
): Promise<AudioAnalysisResult> {
  console.log(`[Audio] Analyzing audio file: ${fileName}, isPodcast: ${isPodcast}`);
  
  const systemPrompt = `You are an expert media analyst for a motorsports media library (World Moto Clash).
Analyze the audio file based on its filename and classify it appropriately.

Return a JSON object with:
{
  "scene": "one of: podcast, interview, commentary, sound-effect, music, ambient, announcement",
  "mood": "one of: informative, inspirational, intense, relaxed, conversational, dramatic, energetic",
  "use_cases": ["suggested uses like: podcast-feed, social-media, behind-the-scenes, race-broadcast"],
  "description": "A concise 1-2 sentence description of the likely audio content",
  "confidence": 0.5
}

${isPodcast ? 'IMPORTANT: This file has been explicitly marked as a PODCAST episode by the uploader.' : ''}
Since you cannot hear the audio, base your analysis on the filename and use lower confidence (0.4-0.7).`;

  const userPrompt = `Classify this audio file: "${fileName}"`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    console.error("AI Gateway error for audio:", response.status);
    // Return defaults
    return {
      tags: isPodcast ? ['podcast', 'interview'] : ['audio'],
      description: isPodcast ? 'Podcast episode from World Moto Clash.' : 'Audio content for motorsports media library.',
      scene: isPodcast ? 'podcast' : 'audio',
      mood: 'informative',
      use_cases: isPodcast ? ['podcast-feed', 'social-media'] : ['general'],
      confidence: 0.5
    };
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    return {
      tags: isPodcast ? ['podcast', 'interview'] : ['audio'],
      description: isPodcast ? 'Podcast episode from World Moto Clash.' : 'Audio content.',
      scene: isPodcast ? 'podcast' : 'audio',
      mood: 'informative',
      use_cases: ['general'],
      confidence: 0.5
    };
  }

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    
    // Build tags from result
    const tags: string[] = [];
    
    // Add podcast tag if flagged
    if (isPodcast) {
      tags.push('podcast');
    }
    
    // Add scene tag
    if (result.scene) {
      const sceneLower = result.scene.toLowerCase();
      const matchedScene = AUDIO_SCENE_TAGS.find(t => sceneLower.includes(t));
      if (matchedScene) tags.push(matchedScene);
    }
    
    // Add mood tag
    if (result.mood) {
      const moodLower = result.mood.toLowerCase();
      const matchedMood = AUDIO_MOOD_TAGS.find(t => moodLower.includes(t));
      if (matchedMood) tags.push(matchedMood);
    }
    
    // Add use case tags
    if (result.use_cases && Array.isArray(result.use_cases)) {
      for (const useCase of result.use_cases.slice(0, 2)) {
        tags.push(useCase.toLowerCase().replace(/\s+/g, '-'));
      }
    }
    
    return {
      tags: [...new Set(tags)],
      description: result.description || (isPodcast ? 'Podcast episode.' : 'Audio content.'),
      scene: result.scene || (isPodcast ? 'podcast' : 'audio'),
      mood: result.mood || 'informative',
      use_cases: result.use_cases || ['general'],
      confidence: result.confidence || 0.5
    };
  } catch (parseError) {
    console.error("Failed to parse audio analysis:", content);
    return {
      tags: isPodcast ? ['podcast'] : ['audio'],
      description: isPodcast ? 'Podcast episode.' : 'Audio content.',
      scene: isPodcast ? 'podcast' : 'audio',
      mood: 'informative',
      use_cases: ['general'],
      confidence: 0.4
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { videoData, fileName, mediaType = 'video', isPodcast } = await req.json() as AnalyzeRequest;

    if (!fileName) {
      return new Response(
        JSON.stringify({ success: false, error: 'No file name provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For audio files, we don't require visual data - use filename-based analysis
    if (mediaType === 'audio') {
      console.log(`🎵 Analyzing audio file: ${fileName}, isPodcast: ${isPodcast}`);
      
      const apiKey = Deno.env.get('LOVABLE_API_KEY');
      if (!apiKey) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI service not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Perform filename-based audio analysis
      const audioResult = await performAudioAnalysis(fileName, apiKey, isPodcast);
      const processingTime = Date.now() - startTime;
      
      return new Response(
        JSON.stringify({
          success: true,
          tags: audioResult.tags,
          description: audioResult.description,
          scene: audioResult.scene,
          mood: audioResult.mood,
          energy: 'moderate',
          use_cases: audioResult.use_cases,
          objects: [],
          confidence: audioResult.confidence,
          processingTime
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For video/image, require visual data
    if (!videoData) {
      return new Response(
        JSON.stringify({ success: false, error: 'No media data provided' }),
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

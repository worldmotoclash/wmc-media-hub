import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Salesforce update endpoint
const SFDC_UPDATE_ENDPOINT = 'https://realintelligence.com/customers/expos/00D5e000000HEcP/exhibitors/engine/update-engine-content.php';

// Picklist values for AI analysis
const SCENE_OPTIONS = [
  'Race Track – On Track', 'Race Track – Grid / Start', 'Race Track – Pit Lane',
  'Race Track – Paddock / Garage', 'Race Track – Victory / Podium', 'Studio',
  'Interview / Talking Head', 'Product Showcase', 'Demo / Walkthrough',
  'Outdoor – Day', 'Outdoor – Night', 'Sunset / Golden Hour', 'Urban / City',
  'Industrial / Warehouse', 'Crowd / Fan Experience', 'Festival / Event Atmosphere',
  'Lifestyle / Off-Track', 'Hospitality / VIP Experience', 'Aerial / Drone',
  'POV / Helmet Cam', 'Onboard / Vehicle Mounted', 'AI-Generated / Virtual',
  'Mixed Reality / Composited', 'Abstract / Graphic', 'Unknown / Unclassified'
];

const MOOD_OPTIONS = [
  'Intense', 'High Energy', 'Aggressive', 'Adrenaline', 'Dramatic', 'Cinematic',
  'Epic', 'Triumphant', 'Celebratory', 'Competitive', 'Focused', 'Tense',
  'Gritty', 'Raw', 'Serious', 'Confident', 'Bold', 'Rebellious', 'Futuristic',
  'Sleek', 'Premium', 'Inspirational', 'Emotional', 'Playful', 'Fun', 'Relaxed',
  'Chill', 'Atmospheric', 'Mysterious', 'Dark', 'Moody', 'Bright', 'Uplifting',
  'Heroic', 'Technical', 'Informative', 'Neutral'
];

const ENERGY_OPTIONS = ['Low', 'Medium', 'High', 'Explosive'];

const USE_CASE_OPTIONS = [
  'Hero / Brand', 'Social Feed', 'Short-Form Video', 'Paid Ad', 'Digital Signage',
  'Website / Landing Page', 'Email Marketing', 'Press / PR', 'Internal Presentation',
  'Sponsor Activation', 'Merch / Product', 'Event Promotion', 'Highlight Reel',
  'Archive / Library', 'Training / Documentation'
];

interface EnrichRequest {
  salesforceId: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  contentName?: string;
  existingFlags?: string; // Existing system flags to preserve
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

interface VideoAnalysisResult {
  transcript?: string;
  keyframes?: Array<{ t: number; label: string }>;
  hasAudio: boolean;
}

interface TechnicalMetadata {
  pixelWidth: number;
  pixelHeight: number;
  aspectRatio: string;
  lengthInSeconds?: number;
  hasAudio?: boolean;
}

// Calculate aspect ratio from dimensions
function calculateAspectRatio(width: number, height: number): string {
  const ratio = width / height;
  if (Math.abs(ratio - 16/9) < 0.05) return '16:9';
  if (Math.abs(ratio - 9/16) < 0.05) return '9:16';
  if (Math.abs(ratio - 1) < 0.05) return '1:1';
  if (Math.abs(ratio - 4/3) < 0.05) return '4:3';
  if (Math.abs(ratio - 3/4) < 0.05) return '3:4';
  if (Math.abs(ratio - 21/9) < 0.05) return '21:9';
  // Return simplified ratio
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(width, height);
  return `${width/divisor}:${height/divisor}`;
}

// Extract technical metadata from media
async function extractTechnicalMetadata(mediaUrl: string, mediaType: 'image' | 'video'): Promise<TechnicalMetadata> {
  console.log(`Extracting technical metadata for ${mediaType}: ${mediaUrl}`);
  
  try {
    // For images, we can try to get dimensions from headers or by fetching
    const response = await fetch(mediaUrl, { method: 'HEAD' });
    const contentLength = response.headers.get('content-length');
    
    // Default values - will be overridden by AI vision analysis
    let width = 1920;
    let height = 1080;
    
    // Try to extract from URL patterns (common for processed images)
    const dimensionMatch = mediaUrl.match(/(\d+)x(\d+)/);
    if (dimensionMatch) {
      width = parseInt(dimensionMatch[1]);
      height = parseInt(dimensionMatch[2]);
    }
    
    const metadata: TechnicalMetadata = {
      pixelWidth: width,
      pixelHeight: height,
      aspectRatio: calculateAspectRatio(width, height),
    };
    
    if (mediaType === 'video') {
      // For video, we'll estimate duration and audio presence via AI
      metadata.lengthInSeconds = 0; // Will be updated if available
      metadata.hasAudio = false; // Will be updated by AI
    }
    
    console.log('Extracted metadata:', metadata);
    return metadata;
  } catch (error) {
    console.error('Error extracting metadata:', error);
    // Return defaults
    return {
      pixelWidth: 1920,
      pixelHeight: 1080,
      aspectRatio: '16:9',
    };
  }
}

// Perform AI visual analysis using Lovable AI Gateway
async function performAIAnalysis(
  mediaUrl: string, 
  mediaType: 'image' | 'video',
  apiKey: string
): Promise<AIAnalysisResult> {
  console.log(`Performing AI analysis for ${mediaType}: ${mediaUrl}`);
  
  const systemPrompt = `You are an AI media analyst specializing in motorsport and racing content for World Moto Clash. 
Analyze the provided ${mediaType} and extract semantic intelligence for content management.
Be precise with your classifications - use ONLY the provided picklist values.
Keep descriptions factual, concise (max 3 sentences), without marketing hype or mentioning AI.`;

  const userPrompt = `Analyze this ${mediaType} from World Moto Clash media library: ${mediaUrl}

Extract the following information based on visual analysis:
1. OBJECTS: Identify primary physical elements visible (e.g., motorcycle, helmet, crowd, track, sunset)
2. ACTIONS: Describe dominant actions using short verb phrases (e.g., "racing, overtaking, celebration")
3. SCENE: Choose the single best match from the scene categories
4. MOOD: Choose the dominant emotional tone
5. ENERGY: Rate the energy level
6. USE CASE: Determine the most likely primary use for this content
7. DESCRIPTION: Write a concise 1-3 sentence description (no marketing hype, no mention of AI)
8. CONFIDENCE: Estimate your confidence in these classifications (0.00-1.00)`;

  const tools = [{
    type: 'function',
    function: {
      name: 'analyze_media_content',
      description: 'Extract semantic intelligence from media content for motorsport/racing context',
      parameters: {
        type: 'object',
        properties: {
          objects: {
            type: 'array',
            items: { type: 'string' },
            description: 'Primary physical elements visible (e.g., motorcycle, helmet, crowd, track)'
          },
          actions: {
            type: 'string',
            description: 'Dominant actions as comma-separated verb phrases (e.g., racing, overtaking, celebration)'
          },
          scene: {
            type: 'string',
            enum: SCENE_OPTIONS,
            description: 'Single best matching scene category'
          },
          mood: {
            type: 'string',
            enum: MOOD_OPTIONS,
            description: 'Dominant emotional tone'
          },
          energy: {
            type: 'string',
            enum: ENERGY_OPTIONS,
            description: 'Energy level of the content'
          },
          useCase: {
            type: 'string',
            enum: USE_CASE_OPTIONS,
            description: 'Most likely primary use for this content'
          },
          description: {
            type: 'string',
            description: 'Concise 1-3 sentence description. No marketing hype. No mention of AI.'
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Confidence score for the analysis (0.00-1.00)'
          }
        },
        required: ['objects', 'actions', 'scene', 'mood', 'energy', 'useCase', 'description', 'confidence']
      }
    }
  }];

  try {
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
        tool_choice: { type: 'function', function: { name: 'analyze_media_content' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received:', JSON.stringify(data, null, 2));

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'analyze_media_content') {
      throw new Error('No valid tool call response from AI');
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log('Parsed AI analysis:', result);

    return {
      objects: result.objects || [],
      actions: result.actions || '',
      scene: result.scene || 'Unknown / Unclassified',
      mood: result.mood || 'Neutral',
      energy: result.energy || 'Medium',
      useCase: result.useCase || 'Archive / Library',
      description: result.description || '',
      confidence: result.confidence || 0.5,
    };
  } catch (error) {
    console.error('AI analysis error:', error);
    throw error;
  }
}

// Perform video-specific analysis (transcript, keyframes)
async function performVideoAnalysis(
  mediaUrl: string,
  apiKey: string
): Promise<VideoAnalysisResult> {
  console.log(`Performing video-specific analysis: ${mediaUrl}`);
  
  const systemPrompt = `You are an AI video analyst for World Moto Clash motorsport content.
Analyze the video and extract:
1. Whether it contains audio (speech, commentary, music, engine sounds)
2. A transcript if there is speech or commentary
3. 3-8 key moments with timestamps and short labels`;

  const tools = [{
    type: 'function',
    function: {
      name: 'analyze_video_content',
      description: 'Extract video-specific information including audio presence, transcript, and keyframes',
      parameters: {
        type: 'object',
        properties: {
          hasAudio: {
            type: 'boolean',
            description: 'Whether the video contains meaningful audio (speech, commentary, music, or significant sound)'
          },
          transcript: {
            type: 'string',
            description: 'Plain text transcript if speech or commentary exists, otherwise empty string'
          },
          keyframes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                t: { type: 'number', description: 'Timestamp in seconds' },
                label: { type: 'string', description: 'Short descriptive label for this moment' }
              },
              required: ['t', 'label']
            },
            description: '3-8 key moments with timestamps and labels'
          }
        },
        required: ['hasAudio', 'transcript', 'keyframes']
      }
    }
  }];

  try {
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
              { 
                type: 'text', 
                text: `Analyze this video from World Moto Clash and extract audio presence, transcript (if any speech/commentary), and 3-8 key moments with timestamps: ${mediaUrl}` 
              },
              { type: 'image_url', image_url: { url: mediaUrl } }
            ]
          }
        ],
        tools,
        tool_choice: { type: 'function', function: { name: 'analyze_video_content' } }
      }),
    });

    if (!response.ok) {
      console.warn('Video analysis failed, using defaults');
      return { hasAudio: false, transcript: '', keyframes: [] };
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return { hasAudio: false, transcript: '', keyframes: [] };
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log('Video analysis result:', result);

    return {
      hasAudio: result.hasAudio || false,
      transcript: result.transcript || '',
      keyframes: result.keyframes || [],
    };
  } catch (error) {
    console.error('Video analysis error:', error);
    return { hasAudio: false };
  }
}

// Update Salesforce Content record via PHP endpoint
async function updateSalesforceContent(
  salesforceId: string,
  fields: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  console.log(`Updating Salesforce Content ${salesforceId} with fields:`, Object.keys(fields));
  
  try {
    const formData = new FormData();
    formData.append('contentId', salesforceId);
    
    // Add all fields to form data
    for (const [key, value] of Object.entries(fields)) {
      formData.append(key, value);
    }

    const response = await fetch(SFDC_UPDATE_ENDPOINT, {
      method: 'POST',
      body: formData,
    });

    const responseText = await response.text();
    console.log('Salesforce update response:', response.status, responseText);

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}: ${responseText}` };
    }

    // Try to parse as JSON, but handle non-JSON responses
    try {
      const data = JSON.parse(responseText);
      if (data.error) {
        return { success: false, error: data.error };
      }
    } catch {
      // Non-JSON response, check for success indicators
      if (responseText.toLowerCase().includes('error')) {
        return { success: false, error: responseText };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Salesforce update error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Build system flags string
function buildSystemFlags(existingFlags?: string): string {
  const newFlags = [
    'AI_ANALYZED',
    'AI_DESCRIPTION_GENERATED',
    'AI_TAGS_GENERATED'
  ];
  
  if (existingFlags) {
    // Parse existing flags and merge
    const existing = existingFlags.split(';').map(f => f.trim()).filter(Boolean);
    const merged = new Set([...existing, ...newFlags]);
    return Array.from(merged).join(';');
  }
  
  return newFlags.join(';');
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const { salesforceId, mediaUrl, mediaType, contentName, existingFlags } = await req.json() as EnrichRequest;

    // Validate required fields
    if (!salesforceId || !mediaUrl || !mediaType) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: salesforceId, mediaUrl, mediaType' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`=== Starting AI enrichment for ${salesforceId} ===`);
    console.log(`Content: ${contentName || 'unnamed'}`);
    console.log(`Media URL: ${mediaUrl}`);
    console.log(`Media Type: ${mediaType}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Step 1: Extract technical metadata
    console.log('Step 1: Extracting technical metadata...');
    const technicalMetadata = await extractTechnicalMetadata(mediaUrl, mediaType);

    // Step 2: Perform AI visual analysis
    console.log('Step 2: Performing AI visual analysis...');
    const aiAnalysis = await performAIAnalysis(mediaUrl, mediaType, LOVABLE_API_KEY);

    // Step 3: Video-specific analysis (if applicable)
    let videoAnalysis: VideoAnalysisResult | null = null;
    if (mediaType === 'video') {
      console.log('Step 3: Performing video-specific analysis...');
      videoAnalysis = await performVideoAnalysis(mediaUrl, LOVABLE_API_KEY);
      // Update hasAudio from video analysis
      technicalMetadata.hasAudio = videoAnalysis.hasAudio;
    }

    // Step 4: Build Salesforce field updates
    console.log('Step 4: Building Salesforce field updates...');
    const timestamp = new Date().toISOString();
    
    const sfdcFields: Record<string, string> = {
      // Technical metadata
      'number_ri1__Pixel_Width__c': String(technicalMetadata.pixelWidth),
      'number_ri1__Pixel_Height__c': String(technicalMetadata.pixelHeight),
      'string_ri1__Aspect_Ratio__c': technicalMetadata.aspectRatio,
      
      // AI analysis fields
      'string_ri1__AI_Objects__c': JSON.stringify(aiAnalysis.objects),
      'string_ri1__AI_Actions__c': aiAnalysis.actions,
      'string_ri1__AI_Scene__c': aiAnalysis.scene,
      'string_ri1__AI_Mood__c': aiAnalysis.mood,
      'string_ri1__AI_Energy__c': aiAnalysis.energy,
      'string_ri1__AI_Use_Case__c': aiAnalysis.useCase,
      'string_ri1__AI_Description__c': aiAnalysis.description,
      'number_ri1__AI_Confidence__c': String(aiAnalysis.confidence),
      'string_ri1__AI_Last_Analyzed__c': timestamp,
      
      // System flags
      'string_ri1__Content_System_Flags__c': buildSystemFlags(existingFlags),
    };

    // Add video-specific fields
    if (mediaType === 'video') {
      sfdcFields['string_ri1__Has_Audio__c'] = technicalMetadata.hasAudio ? 'Yes' : 'No';
      
      if (technicalMetadata.lengthInSeconds !== undefined && technicalMetadata.lengthInSeconds > 0) {
        sfdcFields['number_ri1__Length_in_Seconds__c'] = String(technicalMetadata.lengthInSeconds);
      }
      
      if (videoAnalysis?.transcript) {
        sfdcFields['string_ri1__AI_Transcript__c'] = videoAnalysis.transcript;
      }
      
      if (videoAnalysis?.keyframes && videoAnalysis.keyframes.length > 0) {
        sfdcFields['string_ri1__AI_Keyframes__c'] = JSON.stringify(videoAnalysis.keyframes);
      }
    }

    // Step 5: Update Salesforce
    console.log('Step 5: Updating Salesforce Content record...');
    const updateResult = await updateSalesforceContent(salesforceId, sfdcFields);

    if (!updateResult.success) {
      // Update with error message
      await updateSalesforceContent(salesforceId, {
        'string_ri1__Error_Message__c': `AI Analysis failed: ${updateResult.error}`,
        'string_ri1__AI_Last_Analyzed__c': timestamp,
      });
      
      throw new Error(updateResult.error);
    }

    const duration = Date.now() - startTime;
    console.log(`=== AI enrichment complete for ${salesforceId} in ${duration}ms ===`);

    return new Response(
      JSON.stringify({
        success: true,
        salesforceId,
        fieldsUpdated: Object.keys(sfdcFields),
        confidence: aiAnalysis.confidence,
        duration,
        analysis: {
          scene: aiAnalysis.scene,
          mood: aiAnalysis.mood,
          energy: aiAnalysis.energy,
          useCase: aiAnalysis.useCase,
          objectCount: aiAnalysis.objects.length,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`AI enrichment failed after ${duration}ms:`, error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

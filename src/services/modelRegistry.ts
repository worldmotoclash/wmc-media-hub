interface ModelCapability {
  id: string;
  name: string;
  description: string;
}

interface ModelPricing {
  basis: 'per_run' | 'per_second';
  basePrice: number;
  currency: 'USD';
}

interface ModelSpec {
  maxDuration: number;
  supportedDurations: number[]; // Specific duration values supported
  maxResolution: string;
  aspectRatios: string[];
  fpsOptions: number[];
  audioSupport: boolean;
}

interface ModelLatency {
  typical: number; // seconds
  range: [number, number]; // min, max seconds
}

export interface AIModel {
  id: string;
  name: string;
  displayName: string;
  vendor: 'Google' | 'ByteDance' | 'WaveSpeed' | 'Luma' | 'Pika' | 'PixVerse' | 'OpenAI';
  brand?: string; // Original model creator for filtering (e.g., 'Kling', 'MiniMax')
  pricing: ModelPricing;
  capabilities: string[];
  qualityTier: '480p' | '720p' | '1080p' | '2K' | '4K';
  speedTier: 'Ultra-fast' | 'Standard' | 'High-fidelity';
  specs: ModelSpec;
  latency: ModelLatency;
  commercialUse: 'allowed' | 'restricted' | 'unknown';
  status: 'online' | 'degraded' | 'paused';
  strengths: string[];
  description: string;
  promptTips: string[];
  sampleVideos: string[];
  changelog: string[];
  uptime: number; // percentage
}

export const MODEL_REGISTRY: AIModel[] = [
  {
    id: 'wan_fun',
    name: 'wan_fun',
    displayName: 'WAN 2.2 Fun Control',
    vendor: 'WaveSpeed',
    pricing: { basis: 'per_run', basePrice: 0.20, currency: 'USD' },
    capabilities: ['fun_control', 'balanced'],
    qualityTier: '720p',
    speedTier: 'Standard',
    specs: {
      maxDuration: 8,
      supportedDurations: [5, 8],
      maxResolution: '720p',
      aspectRatios: ['16:9', '9:16'],
      fpsOptions: [24, 30],
      audioSupport: false
    },
    latency: { typical: 45, range: [30, 60] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['Fun Control', 'Balanced', 'Cost-effective'],
    description: 'WAN 2.2 Fun Control for dynamic video generation.',
    promptTips: [
      'Good for dynamic content',
      'Supports moderate complexity',
      'Best for 5-8 second clips'
    ],
    sampleVideos: [],
    changelog: ['v2.2: Improved control', 'v2.1: Speed optimizations'],
    uptime: 97.5
  },
  {
    id: 'wan_ultrafast',
    name: 'wan_ultrafast',
    displayName: 'Wan Ultra-Fast',
    vendor: 'WaveSpeed',
    pricing: { basis: 'per_run', basePrice: 0.10, currency: 'USD' },
    capabilities: ['ultra_fast', 'cost_effective'],
    qualityTier: '480p',
    speedTier: 'Ultra-fast',
    specs: {
      maxDuration: 10,
      supportedDurations: [5, 8, 10],
      maxResolution: '480p',
      aspectRatios: ['16:9', '9:16', '1:1'],
      fpsOptions: [24, 30],
      audioSupport: false
    },
    latency: { typical: 30, range: [20, 45] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['Speed', 'Cost'],
    description: 'Ultra-fast generation for quick content creation and previews.',
    promptTips: [
      'Keep prompts simple and direct',
      'Avoid complex scenes',
      'Best for single-subject content'
    ],
    sampleVideos: [],
    changelog: ['v2.2: Improved stability', 'v2.1: Speed optimizations'],
    uptime: 98.5
  },
  {
    id: 'wan_standard',
    name: 'wan_standard',
    displayName: 'Wan Standard 720p',
    vendor: 'WaveSpeed',
    pricing: { basis: 'per_run', basePrice: 0.15, currency: 'USD' },
    capabilities: ['standard_quality', 'balanced'],
    qualityTier: '720p',
    speedTier: 'Standard',
    specs: {
      maxDuration: 15,
      supportedDurations: [5, 8],
      maxResolution: '720p',
      aspectRatios: ['16:9', '9:16', '1:1'],
      fpsOptions: [24, 30],
      audioSupport: false
    },
    latency: { typical: 60, range: [45, 90] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['Balanced', 'Quality'],
    description: 'Balanced quality and speed for most production needs.',
    promptTips: [
      'Good for detailed scenes',
      'Supports moderate complexity',
      'Ideal for social media content'
    ],
    sampleVideos: [],
    changelog: ['v2.2: Enhanced detail', 'v2.1: Better motion'],
    uptime: 97.8
  },
  {
    id: 'dreamina_1080p',
    name: 'dreamina_1080p',
    displayName: 'Dreamina 1080p',
    vendor: 'ByteDance',
    pricing: { basis: 'per_run', basePrice: 0.60, currency: 'USD' },
    capabilities: ['high_resolution', 'cinematic'],
    qualityTier: '1080p',
    speedTier: 'High-fidelity',
    specs: {
      maxDuration: 20,
      supportedDurations: [5, 8, 10, 15, 20],
      maxResolution: '1080p',
      aspectRatios: ['16:9', '9:16', '1:1', '21:9'],
      fpsOptions: [24, 30, 60],
      audioSupport: false
    },
    latency: { typical: 120, range: [90, 180] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['Cinematic', 'High-res', 'Detail'],
    description: 'High-resolution model for cinematic and professional content.',
    promptTips: [
      'Excellent for cinematic shots',
      'Support complex compositions',
      'Use descriptive camera movements'
    ],
    sampleVideos: [],
    changelog: ['v3.0: Major quality upgrade', 'v2.9: Better lighting'],
    uptime: 96.2
  },
  {
    id: 'pixverse_premium_1080p',
    name: 'pixverse_premium_1080p',
    displayName: 'PixVerse Premium 1080p',
    vendor: 'PixVerse',
    pricing: { basis: 'per_run', basePrice: 1.50, currency: 'USD' },
    capabilities: ['premium_quality', 'lip_sync', 'multi_shot'],
    qualityTier: '1080p',
    speedTier: 'High-fidelity',
    specs: {
      maxDuration: 25,
      supportedDurations: [5, 8, 10, 15, 20, 25],
      maxResolution: '1080p',
      aspectRatios: ['16:9', '9:16', '1:1'],
      fpsOptions: [24, 30, 60],
      audioSupport: true
    },
    latency: { typical: 180, range: [120, 240] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['Lip-sync', 'Multi-shot', 'Premium'],
    description: 'Premium model with advanced lip-sync and multi-shot capabilities.',
    promptTips: [
      'Excellent for talking head content',
      'Supports character consistency',
      'Good for dialogue scenes'
    ],
    sampleVideos: [],
    changelog: ['v4.1: Improved lip-sync', 'v4.0: Multi-shot coherence'],
    uptime: 94.5
  },
  // Veo 3.1 Models (Latest)
  {
    id: 'veo31',
    name: 'veo31',
    displayName: 'Veo 3.1',
    vendor: 'Google',
    pricing: { basis: 'per_second', basePrice: 0.30, currency: 'USD' },
    capabilities: ['google_quality', 'audio_generation', 'cinematic', 'high_quality'],
    qualityTier: '1080p',
    speedTier: 'High-fidelity',
    specs: {
      maxDuration: 30,
      supportedDurations: [5, 8, 10, 15, 20, 25, 30],
      maxResolution: '1080p',
      aspectRatios: ['16:9', '9:16', '1:1', '21:9'],
      fpsOptions: [24, 30, 60],
      audioSupport: true
    },
    latency: { typical: 180, range: [120, 240] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['Cinematic motion', 'Native dialogue', 'Spatial sound', 'Scene continuity'],
    description: 'Generates cinematic motion with native dialogue, spatial sound, and realistic scene continuity.',
    promptTips: [
      'Use quotes for dialogue: "Hello world"',
      'Describe ambient sounds and effects',
      'Excellent for cinematic storytelling',
      'Supports complex scene continuity'
    ],
    sampleVideos: [],
    changelog: ['v3.1: Cinematic motion + spatial audio', 'v3.0: Initial release'],
    uptime: 99.2
  },
  {
    id: 'veo31_fast',
    name: 'veo31_fast',
    displayName: 'Veo 3.1 Fast',
    vendor: 'Google',
    pricing: { basis: 'per_second', basePrice: 0.12, currency: 'USD' },
    capabilities: ['google_quality', 'fast_turnaround', 'audio_generation', 'cost_effective'],
    qualityTier: '1080p',
    speedTier: 'Standard',
    specs: {
      maxDuration: 30,
      supportedDurations: [5, 8, 10, 15, 20, 25, 30],
      maxResolution: '1080p',
      aspectRatios: ['16:9', '9:16', '1:1'],
      fpsOptions: [24, 30],
      audioSupport: true
    },
    latency: { typical: 60, range: [40, 90] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['30% faster', '62.5% cheaper', 'High visual fidelity'],
    description: '30% faster and 62.5% cheaper than base model, while preserving high visual fidelity.',
    promptTips: [
      'Great for rapid iteration',
      'Good for short-form and social content',
      'Use for previews and testing'
    ],
    sampleVideos: [],
    changelog: ['v3.1: Speed optimizations', 'v3.0: Initial release'],
    uptime: 99.5
  },
  {
    id: 'veo31_i2v',
    name: 'veo31_i2v',
    displayName: 'Veo 3.1 I2V',
    vendor: 'Google',
    pricing: { basis: 'per_second', basePrice: 0.28, currency: 'USD' },
    capabilities: ['google_quality', 'image_to_video', 'audio_generation', 'realistic_motion'],
    qualityTier: '1080p',
    speedTier: 'High-fidelity',
    specs: {
      maxDuration: 20,
      supportedDurations: [5, 8, 10, 15, 20],
      maxResolution: '1080p',
      aspectRatios: ['16:9', '9:16', '1:1'],
      fpsOptions: [24, 30],
      audioSupport: true
    },
    latency: { typical: 150, range: [100, 200] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['Image-to-Video', 'Natural ambient audio', 'Lifelike motion'],
    description: 'Turns a still image into smooth, lifelike motion with natural ambient audio.',
    promptTips: [
      'Provide high-quality source images',
      'Describe the desired motion',
      'Ambient audio is auto-generated'
    ],
    sampleVideos: [],
    changelog: ['v3.1: Enhanced image conditioning', 'v3.0: I2V support'],
    uptime: 98.8
  },
  {
    id: 'veo31_fast_i2v',
    name: 'veo31_fast_i2v',
    displayName: 'Veo 3.1 Fast I2V',
    vendor: 'Google',
    pricing: { basis: 'per_second', basePrice: 0.10, currency: 'USD' },
    capabilities: ['google_quality', 'image_to_video', 'fast_turnaround', 'cost_effective'],
    qualityTier: '1080p',
    speedTier: 'Ultra-fast',
    specs: {
      maxDuration: 15,
      supportedDurations: [5, 8, 10, 15],
      maxResolution: '1080p',
      aspectRatios: ['16:9', '9:16', '1:1'],
      fpsOptions: [24, 30],
      audioSupport: true
    },
    latency: { typical: 45, range: [30, 60] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['Fast I2V', 'Cost-effective', 'Rapid iteration'],
    description: 'High-performance I2V version for rapid testing, previews, and content iteration.',
    promptTips: [
      'Best for quick iterations',
      'Good for preview generation',
      'Cost-effective for testing'
    ],
    sampleVideos: [],
    changelog: ['v3.1: Speed optimized I2V', 'v3.0: Initial release'],
    uptime: 99.3
  },
  {
    id: 'veo31_r2v',
    name: 'veo31_r2v',
    displayName: 'Veo 3.1 R2V',
    vendor: 'Google',
    pricing: { basis: 'per_second', basePrice: 0.35, currency: 'USD' },
    capabilities: ['google_quality', 'reference_video', 'cinematic', 'style_control'],
    qualityTier: '1080p',
    speedTier: 'High-fidelity',
    specs: {
      maxDuration: 20,
      supportedDurations: [5, 8, 10, 15, 20],
      maxResolution: '1080p',
      aspectRatios: ['16:9', '9:16', '1:1', '21:9'],
      fpsOptions: [24, 30, 60],
      audioSupport: true
    },
    latency: { typical: 200, range: [150, 280] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['Reference video', 'Style preservation', 'Cinematic tone'],
    description: 'Transforms a single reference video into a new, high-fidelity scene while preserving motion style, framing, and cinematic tone.',
    promptTips: [
      'Provide a reference video for style',
      'Motion and framing are preserved',
      'Great for style transfer'
    ],
    sampleVideos: [],
    changelog: ['v3.1: Reference-to-video support', 'v3.0: Initial release'],
    uptime: 97.5
  },
  {
    id: 'veo31_extend',
    name: 'veo31_extend',
    displayName: 'Veo 3.1 Video Extend',
    vendor: 'Google',
    pricing: { basis: 'per_second', basePrice: 0.25, currency: 'USD' },
    capabilities: ['google_quality', 'video_extend', 'audio_generation', 'long_form'],
    qualityTier: '1080p',
    speedTier: 'High-fidelity',
    specs: {
      maxDuration: 30,
      supportedDurations: [5, 10, 15, 20, 25, 30],
      maxResolution: '1080p',
      aspectRatios: ['16:9', '9:16', '1:1'],
      fpsOptions: [24, 30],
      audioSupport: true
    },
    latency: { typical: 180, range: [120, 240] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['Video continuation', 'Scene continuity', 'Audio sync'],
    description: 'Extend an existing Veo video with cinematic continuity (scene, motion, and audio) for "what happens next" storytelling.',
    promptTips: [
      'Requires a Veo-generated input video',
      'Describe what happens next',
      'Maintains style and audio'
    ],
    sampleVideos: [],
    changelog: ['v3.1: Video extend support', 'v3.0: Initial release'],
    uptime: 98.0
  },
  {
    id: 'veo31_fast_extend',
    name: 'veo31_fast_extend',
    displayName: 'Veo 3.1 Fast Video Extend',
    vendor: 'Google',
    pricing: { basis: 'per_second', basePrice: 0.10, currency: 'USD' },
    capabilities: ['google_quality', 'video_extend', 'fast_turnaround', 'cost_effective'],
    qualityTier: '1080p',
    speedTier: 'Ultra-fast',
    specs: {
      maxDuration: 20,
      supportedDurations: [5, 10, 15, 20],
      maxResolution: '1080p',
      aspectRatios: ['16:9', '9:16', '1:1'],
      fpsOptions: [24, 30],
      audioSupport: true
    },
    latency: { typical: 60, range: [40, 90] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['Fast extend', 'Cost-efficient', 'Multi-branch'],
    description: 'High-speed, cost-efficient extend workflow for rapid iteration, previews, and multi-branch continuations.',
    promptTips: [
      'Good for testing different story branches',
      'Fast iteration on continuations',
      'Preview before full extend'
    ],
    sampleVideos: [],
    changelog: ['v3.1: Fast extend support', 'v3.0: Initial release'],
    uptime: 99.0
  },
  // Veo 3 Models
  {
    id: 'veo3',
    name: 'veo3',
    displayName: 'Veo 3',
    vendor: 'Google',
    pricing: { basis: 'per_second', basePrice: 0.28, currency: 'USD' },
    capabilities: ['google_quality', 'audio_generation', 'cinematic', 'premium'],
    qualityTier: '1080p',
    speedTier: 'High-fidelity',
    specs: {
      maxDuration: 30,
      supportedDurations: [5, 8, 10, 15, 20, 25, 30],
      maxResolution: '1080p',
      aspectRatios: ['16:9', '9:16', '1:1', '21:9'],
      fpsOptions: [24, 30, 60],
      audioSupport: true
    },
    latency: { typical: 200, range: [150, 300] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['DeepMind flagship', 'Native dialogue', 'Ambient sound', 'Realistic motion'],
    description: 'Flagship text-to-video model from DeepMind, supporting native dialogue, ambient sound, and realistic motion.',
    promptTips: [
      'Use quotes for dialogue',
      'Describe ambient sounds',
      'Excellent for realistic content'
    ],
    sampleVideos: [],
    changelog: ['v3.0: Flagship release with audio', 'v2.5: Legacy version'],
    uptime: 98.5
  },
  {
    id: 'veo3_fast',
    name: 'veo3_fast',
    displayName: 'Veo 3 Fast',
    vendor: 'Google',
    pricing: { basis: 'per_second', basePrice: 0.10, currency: 'USD' },
    capabilities: ['google_quality', 'fast_turnaround', 'audio_generation', 'cost_effective'],
    qualityTier: '1080p',
    speedTier: 'Standard',
    specs: {
      maxDuration: 30,
      supportedDurations: [5, 8, 10, 15, 20, 25, 30],
      maxResolution: '1080p',
      aspectRatios: ['16:9', '9:16', '1:1'],
      fpsOptions: [24, 30],
      audioSupport: true
    },
    latency: { typical: 60, range: [40, 90] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['30% faster', '62.5% cheaper', 'Short-form optimized'],
    description: '30% faster and 62.5% cheaper; optimized for short-form and social content.',
    promptTips: [
      'Great for social media content',
      'Works well with natural language',
      'Use for rapid iteration'
    ],
    sampleVideos: [],
    changelog: ['v3.0: Speed optimizations', 'v2.5: Legacy version'],
    uptime: 99.1
  },
  {
    id: 'veo3_i2v',
    name: 'veo3_i2v',
    displayName: 'Veo 3 I2V',
    vendor: 'Google',
    pricing: { basis: 'per_second', basePrice: 0.25, currency: 'USD' },
    capabilities: ['google_quality', 'image_to_video', 'audio_generation', 'realistic_motion'],
    qualityTier: '1080p',
    speedTier: 'High-fidelity',
    specs: {
      maxDuration: 20,
      supportedDurations: [5, 8, 10, 15, 20],
      maxResolution: '1080p',
      aspectRatios: ['16:9', '9:16', '1:1'],
      fpsOptions: [24, 30],
      audioSupport: true
    },
    latency: { typical: 150, range: [100, 200] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['Image-to-Video', 'Lifelike motion', 'Synchronized audio'],
    description: 'Converts still images into smooth, lifelike motion with synchronized audio.',
    promptTips: [
      'Use high-quality source images',
      'Describe the motion you want',
      'Audio is auto-generated'
    ],
    sampleVideos: [],
    changelog: ['v3.0: I2V with audio', 'v2.5: Legacy I2V'],
    uptime: 98.2
  },
  {
    id: 'veo3_fast_i2v',
    name: 'veo3_fast_i2v',
    displayName: 'Veo 3 Fast I2V',
    vendor: 'Google',
    pricing: { basis: 'per_second', basePrice: 0.08, currency: 'USD' },
    capabilities: ['google_quality', 'image_to_video', 'fast_turnaround', 'cost_effective'],
    qualityTier: '1080p',
    speedTier: 'Ultra-fast',
    specs: {
      maxDuration: 15,
      supportedDurations: [5, 8, 10, 15],
      maxResolution: '1080p',
      aspectRatios: ['16:9', '9:16', '1:1'],
      fpsOptions: [24, 30],
      audioSupport: true
    },
    latency: { typical: 45, range: [30, 60] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['Fast I2V', 'Cost-efficient', 'Rapid iteration'],
    description: 'High-speed, cost-efficient I2V version for rapid iteration.',
    promptTips: [
      'Best for quick tests',
      'Preview generation',
      'Cost-effective for iteration'
    ],
    sampleVideos: [],
    changelog: ['v3.0: Fast I2V release', 'v2.5: Legacy fast'],
    uptime: 99.0
  },
  {
    id: 'veo2_i2v',
    name: 'veo2_i2v',
    displayName: 'Veo 2 I2V (Legacy)',
    vendor: 'Google',
    pricing: { basis: 'per_second', basePrice: 0.15, currency: 'USD' },
    capabilities: ['google_quality', 'image_to_video', 'stylized'],
    qualityTier: '720p',
    speedTier: 'Standard',
    specs: {
      maxDuration: 15,
      supportedDurations: [5, 8, 10, 15],
      maxResolution: '720p',
      aspectRatios: ['16:9', '9:16', '1:1'],
      fpsOptions: [24, 30],
      audioSupport: false
    },
    latency: { typical: 90, range: [60, 120] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['Legacy generation', 'Nostalgic style', 'Stylized motion'],
    description: 'Legacy generation model with nostalgic or stylized motion.',
    promptTips: [
      'Good for stylized content',
      'Nostalgic aesthetic',
      'Cost-effective option'
    ],
    sampleVideos: [],
    changelog: ['v2.0: Legacy maintained', 'v1.5: Original release'],
    uptime: 96.5
  },
  {
    id: 'sora_wavespeed',
    name: 'sora_wavespeed',
    displayName: 'OpenAI Sora (via WaveSpeed)',
    vendor: 'OpenAI',
    pricing: { basis: 'per_run', basePrice: 4.00, currency: 'USD' },
    capabilities: ['openai_quality', 'premium', 'cinematic', 'long_form'],
    qualityTier: '1080p',
    speedTier: 'High-fidelity',
    specs: {
      maxDuration: 60,
      supportedDurations: [5, 10, 15, 20, 30, 45, 60],
      maxResolution: '1080p',
      aspectRatios: ['16:9', '9:16', '1:1', '21:9'],
      fpsOptions: [24, 30, 60],
      audioSupport: false
    },
    latency: { typical: 420, range: [300, 600] },
    commercialUse: 'restricted',
    status: 'online',
    strengths: ['Cinematic', 'Long-form', 'Premium'],
    description: 'OpenAI\'s flagship video model for the highest quality generations.',
    promptTips: [
      'Use detailed cinematic descriptions',
      'Excellent for creative concepts',
      'Best for premium productions'
    ],
    sampleVideos: [],
    changelog: ['v1.2: Improved consistency', 'v1.1: Beta release'],
    uptime: 92.3
  },
  // Luma Models
  {
    id: 'luma_dream_machine',
    name: 'luma_dream_machine',
    displayName: 'Dream Machine 1.6',
    vendor: 'Luma',
    pricing: { basis: 'per_run', basePrice: 0.80, currency: 'USD' },
    capabilities: ['image_to_video', 'realistic_motion', 'high_quality'],
    qualityTier: '1080p',
    speedTier: 'Standard',
    specs: {
      maxDuration: 5,
      supportedDurations: [5],
      maxResolution: '1080p',
      aspectRatios: ['16:9', '9:16', '1:1'],
      fpsOptions: [24, 30],
      audioSupport: false
    },
    latency: { typical: 90, range: [60, 120] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['Image-to-video', 'Realistic motion', 'Quality'],
    description: 'Luma\'s flagship model for high-quality video generation from text and images.',
    promptTips: [
      'Great for realistic motion',
      'Excels with image inputs',
      'Good for natural movements'
    ],
    sampleVideos: [],
    changelog: ['v1.6: Enhanced motion quality', 'v1.5: Image conditioning'],
    uptime: 95.8
  },
  {
    id: 'luma_ray',
    name: 'luma_ray',
    displayName: 'Luma Ray (Fast)',
    vendor: 'Luma',
    pricing: { basis: 'per_run', basePrice: 0.35, currency: 'USD' },
    capabilities: ['ultra_fast', 'image_to_video', 'cost_effective'],
    qualityTier: '720p',
    speedTier: 'Ultra-fast',
    specs: {
      maxDuration: 5,
      supportedDurations: [5],
      maxResolution: '720p',
      aspectRatios: ['16:9', '9:16', '1:1'],
      fpsOptions: [24, 30],
      audioSupport: false
    },
    latency: { typical: 45, range: [30, 60] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['Speed', 'Cost', 'Image-to-video'],
    description: 'Fast and cost-effective video generation with image conditioning.',
    promptTips: [
      'Best for quick iterations',
      'Good with simple motions',
      'Cost-effective for testing'
    ],
    sampleVideos: [],
    changelog: ['v1.2: Speed optimizations', 'v1.1: Initial release'],
    uptime: 97.2
  },
  // Pika Models
  {
    id: 'pika_1_5',
    name: 'pika_1_5',
    displayName: 'Pika 1.5',
    vendor: 'Pika',
    pricing: { basis: 'per_run', basePrice: 0.60, currency: 'USD' },
    capabilities: ['creative_effects', 'image_to_video', 'style_control'],
    qualityTier: '1080p',
    speedTier: 'Standard',
    specs: {
      maxDuration: 4,
      supportedDurations: [3, 4],
      maxResolution: '1080p',
      aspectRatios: ['16:9', '9:16', '1:1'],
      fpsOptions: [24, 30],
      audioSupport: false
    },
    latency: { typical: 75, range: [50, 100] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['Creative effects', 'Style control', 'Artistic'],
    description: 'Latest Pika model with enhanced creative effects and style control.',
    promptTips: [
      'Great for creative and artistic content',
      'Excels with style effects',
      'Good for social media content'
    ],
    sampleVideos: [],
    changelog: ['v1.5: Enhanced effects', 'v1.4: Better style control'],
    uptime: 94.1
  },
  {
    id: 'pika_1_0',
    name: 'pika_1_0',
    displayName: 'Pika 1.0',
    vendor: 'Pika',
    pricing: { basis: 'per_run', basePrice: 0.40, currency: 'USD' },
    capabilities: ['creative_effects', 'image_to_video', 'cost_effective'],
    qualityTier: '720p',
    speedTier: 'Standard',
    specs: {
      maxDuration: 3,
      supportedDurations: [3],
      maxResolution: '720p',
      aspectRatios: ['16:9', '9:16', '1:1'],
      fpsOptions: [24, 30],
      audioSupport: false
    },
    latency: { typical: 60, range: [45, 90] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['Creative effects', 'Cost-effective', 'Reliable'],
    description: 'Original Pika model offering creative video effects at affordable pricing.',
    promptTips: [
      'Good for creative experiments',
      'Cost-effective for testing',
      'Simple creative effects'
    ],
    sampleVideos: [],
    changelog: ['v1.0.3: Stability improvements', 'v1.0.2: Bug fixes'],
    uptime: 96.7
  },
  // Kling Models
  {
    id: 'kling_pro',
    name: 'kling_pro',
    displayName: 'Kling Pro',
    vendor: 'WaveSpeed',
    brand: 'Kling',
    pricing: { basis: 'per_run', basePrice: 1.20, currency: 'USD' },
    capabilities: ['high_quality', 'long_form', 'realistic_motion', 'cinematic'],
    qualityTier: '1080p',
    speedTier: 'High-fidelity',
    specs: {
      maxDuration: 10,
      supportedDurations: [5, 10],
      maxResolution: '1080p',
      aspectRatios: ['16:9', '9:16', '1:1'],
      fpsOptions: [24, 30],
      audioSupport: false
    },
    latency: { typical: 150, range: [120, 200] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['High quality', 'Long duration', 'Cinematic'],
    description: 'Premium Kling model for high-quality, longer-duration video generation.',
    promptTips: [
      'Excellent for detailed scenes',
      'Supports complex movements',
      'Good for cinematic content'
    ],
    sampleVideos: [],
    changelog: ['v2.1: Quality improvements', 'v2.0: Pro features'],
    uptime: 93.4
  },
  {
    id: 'kling_standard',
    name: 'kling_standard',
    displayName: 'Kling Standard',
    vendor: 'WaveSpeed',
    brand: 'Kling',
    pricing: { basis: 'per_run', basePrice: 0.70, currency: 'USD' },
    capabilities: ['balanced', 'realistic_motion', 'standard_quality'],
    qualityTier: '720p',
    speedTier: 'Standard',
    specs: {
      maxDuration: 5,
      supportedDurations: [5],
      maxResolution: '720p',
      aspectRatios: ['16:9', '9:16', '1:1'],
      fpsOptions: [24, 30],
      audioSupport: false
    },
    latency: { typical: 90, range: [70, 120] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['Balanced', 'Reliable', 'Good motion'],
    description: 'Standard Kling model offering balanced quality and performance.',
    promptTips: [
      'Good for general content',
      'Reliable motion quality',
      'Balanced cost/quality'
    ],
    sampleVideos: [],
    changelog: ['v1.8: Motion improvements', 'v1.7: Stability fixes'],
    uptime: 96.1
  },
  // MiniMax Models
  {
    id: 'minimax_video_01',
    name: 'minimax_video_01',
    displayName: 'MiniMax Video-01',
    vendor: 'WaveSpeed',
    brand: 'MiniMax',
    pricing: { basis: 'per_run', basePrice: 0.90, currency: 'USD' },
    capabilities: ['high_quality', 'balanced', 'realistic_motion'],
    qualityTier: '1080p',
    speedTier: 'Standard',
    specs: {
      maxDuration: 6,
      supportedDurations: [6],
      maxResolution: '1080p',
      aspectRatios: ['16:9', '9:16', '1:1'],
      fpsOptions: [25, 30],
      audioSupport: false
    },
    latency: { typical: 100, range: [80, 140] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['High quality', 'Consistent', 'Good detail'],
    description: 'MiniMax\'s flagship video generation model with high quality output.',
    promptTips: [
      'Great for detailed content',
      'Consistent quality',
      'Good for realistic scenes'
    ],
    sampleVideos: [],
    changelog: ['v1.3: Quality enhancements', 'v1.2: Performance improvements'],
    uptime: 95.5
  },
  {
    id: 'minimax_lite',
    name: 'minimax_lite',
    displayName: 'MiniMax Lite',
    vendor: 'WaveSpeed',
    brand: 'MiniMax',
    pricing: { basis: 'per_run', basePrice: 0.45, currency: 'USD' },
    capabilities: ['cost_effective', 'fast_turnaround', 'balanced'],
    qualityTier: '720p',
    speedTier: 'Standard',
    specs: {
      maxDuration: 6,
      supportedDurations: [6],
      maxResolution: '720p',
      aspectRatios: ['16:9', '9:16', '1:1'],
      fpsOptions: [25, 30],
      audioSupport: false
    },
    latency: { typical: 70, range: [50, 90] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['Cost-effective', 'Fast', 'Reliable'],
    description: 'Lightweight MiniMax model for cost-effective video generation.',
    promptTips: [
      'Good for quick content',
      'Cost-effective option',
      'Reliable for simple scenes'
    ],
    sampleVideos: [],
    changelog: ['v1.1: Speed optimizations', 'v1.0: Initial release'],
    uptime: 97.8
  },
  // Vidu Image-to-Video Models
  {
    id: 'vidu_i2v',
    name: 'vidu_i2v',
    displayName: 'Vidu Image-to-Video 2.0',
    vendor: 'WaveSpeed',
    pricing: { basis: 'per_run', basePrice: 0.30, currency: 'USD' },
    capabilities: ['image_to_video', 'realistic_motion', 'high_quality'],
    qualityTier: '720p',
    speedTier: 'Standard',
    specs: {
      maxDuration: 8,
      supportedDurations: [4, 8],
      maxResolution: '720p',
      aspectRatios: ['16:9', '9:16', '1:1'],
      fpsOptions: [24, 30],
      audioSupport: false
    },
    latency: { typical: 60, range: [45, 90] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['Image animation', 'Realistic motion', 'Quality output'],
    description: 'Animate a single image into a video with realistic motion and high quality.',
    promptTips: [
      'Provide a clear starting image',
      'Describe the desired motion in prompt',
      'Works best with high-quality source images'
    ],
    sampleVideos: [],
    changelog: ['v2.0: Enhanced motion quality', 'v1.5: Initial release'],
    uptime: 96.5
  },
  {
    id: 'vidu_start_end',
    name: 'vidu_start_end',
    displayName: 'Vidu Start-End-to-Video 2.0',
    vendor: 'WaveSpeed',
    pricing: { basis: 'per_run', basePrice: 0.35, currency: 'USD' },
    capabilities: ['start_end_image', 'image_to_video', 'transition', 'high_quality'],
    qualityTier: '720p',
    speedTier: 'Standard',
    specs: {
      maxDuration: 8,
      supportedDurations: [4, 8],
      maxResolution: '720p',
      aspectRatios: ['16:9', '9:16', '1:1'],
      fpsOptions: [24, 30],
      audioSupport: false
    },
    latency: { typical: 75, range: [60, 100] },
    commercialUse: 'allowed',
    status: 'online',
    strengths: ['Start/End frames', 'Smooth transitions', 'Creative control'],
    description: 'Create smooth video transitions between a start image and end image.',
    promptTips: [
      'Provide both start and end images',
      'Use similar subjects for smoother transitions',
      'Describe the transition style in prompt'
    ],
    sampleVideos: [],
    changelog: ['v2.0: Improved transition quality', 'v1.5: Initial release'],
    uptime: 95.8
  }
];

export const MODEL_CAPABILITIES: ModelCapability[] = [
  { id: 'ultra_fast', name: 'Ultra-Fast', description: 'Generates in under 30 seconds' },
  { id: 'fun_control', name: 'Fun Control', description: 'Advanced control mechanisms for dynamic video' },
  { id: 'audio_generation', name: 'Audio', description: 'Includes audio generation' },
  { id: 'lip_sync', name: 'Lip-Sync', description: 'Accurate lip synchronization' },
  { id: 'multi_shot', name: 'Multi-Shot', description: 'Maintains coherence across shots' },
  { id: 'cinematic', name: 'Cinematic', description: 'Film-quality visuals' },
  { id: 'long_form', name: 'Long-Form', description: 'Supports longer durations' },
  { id: 'cost_effective', name: 'Cost Effective', description: 'Budget-friendly pricing' },
  { id: 'premium', name: 'Premium', description: 'Highest quality available' },
  { id: 'image_to_video', name: 'Image-to-Video', description: 'Converts images to video' },
  { id: 'creative_effects', name: 'Creative Effects', description: 'Artistic and creative video effects' },
  { id: 'style_control', name: 'Style Control', description: 'Advanced style and aesthetic control' },
  { id: 'realistic_motion', name: 'Realistic Motion', description: 'Natural and realistic movement' },
  { id: 'high_quality', name: 'High Quality', description: 'Superior visual quality' },
  { id: 'balanced', name: 'Balanced', description: 'Good balance of quality, speed, and cost' },
  { id: 'standard_quality', name: 'Standard Quality', description: 'Reliable standard quality output' },
  { id: 'fast_turnaround', name: 'Fast Turnaround', description: 'Quick generation times' },
  { id: 'google_quality', name: 'Google Quality', description: 'Google AI powered generation' },
  { id: 'openai_quality', name: 'OpenAI Quality', description: 'OpenAI powered generation' },
  { id: 'premium_quality', name: 'Premium Quality', description: 'Premium tier quality' },
  { id: 'start_end_image', name: 'Start/End Image', description: 'Supports both start and end image frames' },
  { id: 'transition', name: 'Transition', description: 'Creates smooth transitions between frames' },
  { id: 'video_extend', name: 'Video Extend', description: 'Extends existing videos with seamless continuity' },
  { id: 'reference_video', name: 'Reference Video', description: 'Uses reference video for style and motion' },
  { id: 'stylized', name: 'Stylized', description: 'Artistic and stylized video output' }
];

export const getModelById = (id: string): AIModel | undefined => {
  return MODEL_REGISTRY.find(model => model.id === id);
};

export const getModelsByVendor = (vendor: string): AIModel[] => {
  return MODEL_REGISTRY.filter(model => model.vendor === vendor);
};

export const getModelsByCapability = (capability: string): AIModel[] => {
  return MODEL_REGISTRY.filter(model => model.capabilities.includes(capability));
};

export const getModelsByQualityTier = (tier: string): AIModel[] => {
  return MODEL_REGISTRY.filter(model => model.qualityTier === tier);
};

export const getAvailableModels = (): AIModel[] => {
  return MODEL_REGISTRY.filter(model => model.status === 'online');
};
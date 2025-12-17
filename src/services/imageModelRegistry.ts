// Image Model Registry - Structured like the video model registry for consistency

export interface ImageModelPricing {
  basis: 'included' | 'per_image';
  basePrice: number;
  currency: 'USD';
}

export interface ImageModel {
  id: string;
  name: string;
  displayName: string;
  vendor: string;
  brand?: string;
  model: string; // API model identifier
  description: string;
  qualityTier: 'fast' | 'standard' | 'premium';
  speedTier: 'ultra-fast' | 'fast' | 'standard';
  pricing: ImageModelPricing;
  capabilities: string[];
  status: 'online' | 'degraded' | 'paused';
  strengths: string[];
  commercialUse: 'allowed' | 'restricted' | 'unknown';
  uptime: number;
}

export const IMAGE_MODEL_REGISTRY: ImageModel[] = [
  // Lovable AI models (via AI Gateway)
  {
    id: 'gemini-flash-image',
    name: 'gemini-flash-image',
    displayName: 'Gemini 2.5 Flash Image',
    vendor: 'Lovable AI',
    brand: 'Google',
    model: 'google/gemini-2.5-flash-image-preview',
    description: 'Fast, high-quality image generation powered by Google Gemini',
    qualityTier: 'standard',
    speedTier: 'fast',
    pricing: { basis: 'included', basePrice: 0, currency: 'USD' },
    capabilities: ['text_to_image', 'image_editing', 'fast_generation'],
    status: 'online',
    strengths: ['Fast', 'High quality', 'Included in plan'],
    commercialUse: 'allowed',
    uptime: 99.5
  },
  {
    id: 'gemini-3-pro-image',
    name: 'gemini-3-pro-image',
    displayName: 'Gemini 3 Pro Image',
    vendor: 'Lovable AI',
    brand: 'Google',
    model: 'google/gemini-3-pro-image-preview',
    description: 'Next-gen premium quality image generation from Google',
    qualityTier: 'premium',
    speedTier: 'standard',
    pricing: { basis: 'included', basePrice: 0, currency: 'USD' },
    capabilities: ['text_to_image', 'image_editing', 'premium_quality', 'complex_scenes'],
    status: 'online',
    strengths: ['Premium quality', 'Complex scenes', 'Included in plan'],
    commercialUse: 'allowed',
    uptime: 98.5
  },
  // Wavespeed FLUX models
  {
    id: 'flux-schnell',
    name: 'flux-schnell',
    displayName: 'FLUX Schnell',
    vendor: 'Wavespeed',
    brand: 'Black Forest Labs',
    model: 'wavespeed-ai/flux-schnell',
    description: 'Ultra-fast 12B parameter model optimized for speed (1-4 steps)',
    qualityTier: 'fast',
    speedTier: 'ultra-fast',
    pricing: { basis: 'per_image', basePrice: 0.003, currency: 'USD' },
    capabilities: ['text_to_image', 'ultra_fast', 'cost_effective'],
    status: 'online',
    strengths: ['Ultra-fast', 'Very cheap', 'Good for previews'],
    commercialUse: 'allowed',
    uptime: 97.8
  },
  {
    id: 'flux-dev',
    name: 'flux-dev',
    displayName: 'FLUX Dev',
    vendor: 'Wavespeed',
    brand: 'Black Forest Labs',
    model: 'flux/dev',
    description: 'High-quality production model for professional image generation',
    qualityTier: 'premium',
    speedTier: 'standard',
    pricing: { basis: 'per_image', basePrice: 0.025, currency: 'USD' },
    capabilities: ['text_to_image', 'high_quality', 'detailed'],
    status: 'online',
    strengths: ['High quality', 'Production ready', 'Detailed output'],
    commercialUse: 'allowed',
    uptime: 96.5
  }
];

export const getImageModelById = (id: string): ImageModel | undefined => {
  return IMAGE_MODEL_REGISTRY.find(model => model.id === id);
};

export const getImageModelsByVendor = (vendor: string): ImageModel[] => {
  return IMAGE_MODEL_REGISTRY.filter(model => model.vendor === vendor || model.brand === vendor);
};

export const getAvailableImageModels = (): ImageModel[] => {
  return IMAGE_MODEL_REGISTRY.filter(model => model.status === 'online');
};

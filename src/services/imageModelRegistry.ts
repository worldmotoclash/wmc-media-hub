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
  // Lovable AI models (via AI Gateway) - Nano Banana Series
  {
    id: 'gemini-flash-image',
    name: 'gemini-flash-image',
    displayName: 'Nano Banana',
    vendor: 'Lovable AI',
    brand: 'Google',
    model: 'google/gemini-2.5-flash-image-preview',
    description: 'Fast, high-quality image generation (Gemini 2.5 Flash Image)',
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
    displayName: 'Nano Banana Pro',
    vendor: 'Lovable AI',
    brand: 'Google',
    model: 'google/gemini-3-pro-image-preview',
    description: 'Next-gen premium quality image generation (Gemini 3 Pro Image)',
    qualityTier: 'premium',
    speedTier: 'standard',
    pricing: { basis: 'included', basePrice: 0, currency: 'USD' },
    capabilities: ['text_to_image', 'image_editing', 'premium_quality', 'complex_scenes'],
    status: 'online',
    strengths: ['Premium quality', 'Complex scenes', 'Included in plan', 'Pro tier'],
    commercialUse: 'allowed',
    uptime: 98.5
  },
  // Nano Banana Pro Edit variants (via WaveSpeed)
  {
    id: 'nano-banana-pro-edit',
    name: 'nano-banana-pro-edit',
    displayName: 'Nano Banana Pro Edit',
    vendor: 'Wavespeed',
    brand: 'Google',
    model: 'google/nano-banana-pro/edit',
    description: 'Google Nano Banana Pro (Gemini 3.0 Pro Image) Edit enables image editing with next-gen quality',
    qualityTier: 'premium',
    speedTier: 'standard',
    pricing: { basis: 'per_image', basePrice: 0.03, currency: 'USD' },
    capabilities: ['image_editing', 'premium_quality', 'inpainting'],
    status: 'online',
    strengths: ['Pro-tier editing', 'High fidelity', 'Precise edits'],
    commercialUse: 'allowed',
    uptime: 98.0
  },
  {
    id: 'nano-banana-pro-edit-ultra',
    name: 'nano-banana-pro-edit-ultra',
    displayName: 'Nano Banana Pro Edit Ultra',
    vendor: 'Wavespeed',
    brand: 'Google',
    model: 'google/nano-banana-pro/edit-ultra',
    description: 'Google Nano Banana Pro (Gemini 3.0 Pro Image) Edit with ultra-high quality output',
    qualityTier: 'premium',
    speedTier: 'standard',
    pricing: { basis: 'per_image', basePrice: 0.05, currency: 'USD' },
    capabilities: ['image_editing', 'premium_quality', 'ultra_quality', 'inpainting'],
    status: 'online',
    strengths: ['Ultra quality', 'Maximum fidelity', 'Professional edits'],
    commercialUse: 'allowed',
    uptime: 97.5
  },
  {
    id: 'nano-banana-pro-edit-multi',
    name: 'nano-banana-pro-edit-multi',
    displayName: 'Nano Banana Pro Edit Multi',
    vendor: 'Wavespeed',
    brand: 'Google',
    model: 'google/nano-banana-pro/edit-multi',
    description: 'Google Nano Banana Pro (Gemini 3.0 Pro Image) Edit for next-gen multi-image editing',
    qualityTier: 'premium',
    speedTier: 'standard',
    pricing: { basis: 'per_image', basePrice: 0.04, currency: 'USD' },
    capabilities: ['image_editing', 'multi_image', 'premium_quality', 'batch_editing'],
    status: 'online',
    strengths: ['Multi-image support', 'Batch editing', 'Consistent style'],
    commercialUse: 'allowed',
    uptime: 97.8
  },
  {
    id: 'nano-banana-pro-t2i',
    name: 'nano-banana-pro-t2i',
    displayName: 'Nano Banana Pro Text-to-Image',
    vendor: 'Wavespeed',
    brand: 'Google',
    model: 'google/nano-banana-pro/text-to-image',
    description: 'Google Nano Banana Pro (Gemini 3.0 Pro Image) cutting-edge text-to-image generation',
    qualityTier: 'premium',
    speedTier: 'fast',
    pricing: { basis: 'per_image', basePrice: 0.025, currency: 'USD' },
    capabilities: ['text_to_image', 'premium_quality', 'fast_generation'],
    status: 'online',
    strengths: ['Pro-tier quality', 'Fast generation', 'Detailed output'],
    commercialUse: 'allowed',
    uptime: 98.5
  },
  {
    id: 'nano-banana-pro-t2i-ultra',
    name: 'nano-banana-pro-t2i-ultra',
    displayName: 'Nano Banana Pro Text-to-Image Ultra',
    vendor: 'Wavespeed',
    brand: 'Google',
    model: 'google/nano-banana-pro/text-to-image-ultra',
    description: 'Google Nano Banana Pro (Gemini 3.0 Pro Image) ultra-quality text-to-image',
    qualityTier: 'premium',
    speedTier: 'standard',
    pricing: { basis: 'per_image', basePrice: 0.04, currency: 'USD' },
    capabilities: ['text_to_image', 'ultra_quality', 'premium_quality'],
    status: 'online',
    strengths: ['Ultra quality', 'Maximum detail', 'Professional output'],
    commercialUse: 'allowed',
    uptime: 97.5
  },
  {
    id: 'nano-banana-pro-t2i-multi',
    name: 'nano-banana-pro-t2i-multi',
    displayName: 'Nano Banana Pro Text-to-Image Multi',
    vendor: 'Wavespeed',
    brand: 'Google',
    model: 'google/nano-banana-pro/text-to-image-multi',
    description: 'Google Nano Banana Pro (Gemini 3.0 Pro Image) next-gen multi-image text-to-image',
    qualityTier: 'premium',
    speedTier: 'standard',
    pricing: { basis: 'per_image', basePrice: 0.035, currency: 'USD' },
    capabilities: ['text_to_image', 'multi_image', 'premium_quality', 'batch_generation'],
    status: 'online',
    strengths: ['Multi-image output', 'Batch generation', 'Consistent style'],
    commercialUse: 'allowed',
    uptime: 98.0
  },
  // Original Nano Banana (via WaveSpeed)
  {
    id: 'nano-banana-t2i',
    name: 'nano-banana-t2i',
    displayName: 'Nano Banana Text-to-Image',
    vendor: 'Wavespeed',
    brand: 'Google',
    model: 'google/nano-banana/text-to-image',
    description: 'Google Nano Banana cutting-edge text-to-image model',
    qualityTier: 'standard',
    speedTier: 'fast',
    pricing: { basis: 'per_image', basePrice: 0.015, currency: 'USD' },
    capabilities: ['text_to_image', 'fast_generation'],
    status: 'online',
    strengths: ['Fast', 'Cost-effective', 'Good quality'],
    commercialUse: 'allowed',
    uptime: 99.0
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

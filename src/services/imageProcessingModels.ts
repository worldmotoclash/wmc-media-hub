export interface ImageProcessingModel {
  id: string;
  name: string;
  displayName: string;
  type: 'resize' | 'crop' | 'ai_transform';
  vendor: 'Native' | 'Cloudflare' | 'Wavespeed';
  pricing: { basis: 'per_image' | 'free'; basePrice: number; currency: 'USD' };
  capabilities: string[];
  description: string;
  status: 'online' | 'degraded' | 'paused';
}

export const IMAGE_PROCESSING_MODELS: ImageProcessingModel[] = [
  {
    id: 'native_resize',
    name: 'native_resize',
    displayName: 'Native Resize (Fast)',
    type: 'resize',
    vendor: 'Native',
    pricing: { basis: 'free', basePrice: 0, currency: 'USD' },
    capabilities: ['resize', 'crop', 'fit', 'cover'],
    description: 'Server-side image resizing using native canvas APIs. Fast and free. Best for simple resize operations.',
    status: 'online'
  },
  {
    id: 'wavespeed_flux_fill',
    name: 'wavespeed/flux-fill',
    displayName: 'FLUX AI Fill (Outpainting)',
    type: 'ai_transform',
    vendor: 'Wavespeed',
    pricing: { basis: 'per_image', basePrice: 0.05, currency: 'USD' },
    capabilities: ['outpaint', 'aspect_ratio_change', 'ai_fill', 'content_aware'],
    description: 'Uses FLUX AI to intelligently fill/extend images when aspect ratio differs significantly. Best for dramatic aspect ratio changes.',
    status: 'online'
  },
  {
    id: 'wavespeed_inpaint',
    name: 'wavespeed/inpaint',
    displayName: 'FLUX AI Inpaint',
    type: 'ai_transform',
    vendor: 'Wavespeed',
    pricing: { basis: 'per_image', basePrice: 0.04, currency: 'USD' },
    capabilities: ['inpaint', 'remove_objects', 'fill_regions'],
    description: 'AI-powered inpainting for removing unwanted elements or filling specific regions.',
    status: 'online'
  }
];

export function getImageProcessingModelById(id: string): ImageProcessingModel | undefined {
  return IMAGE_PROCESSING_MODELS.find(m => m.id === id);
}

export function getAvailableImageProcessingModels(): ImageProcessingModel[] {
  return IMAGE_PROCESSING_MODELS.filter(m => m.status === 'online');
}

export function getModelsByType(type: ImageProcessingModel['type']): ImageProcessingModel[] {
  return IMAGE_PROCESSING_MODELS.filter(m => m.type === type && m.status === 'online');
}

export interface SocialVariant {
  id: string;
  platform: string;
  variant: string;
  width: number;
  height: number;
  aspectRatio: string;
}

export const SOCIAL_VARIANTS: SocialVariant[] = [
  { id: "instagram-portrait", platform: "Instagram", variant: "Portrait", width: 1080, height: 1350, aspectRatio: "4:5" },
  { id: "instagram-square", platform: "Instagram", variant: "Square", width: 1080, height: 1080, aspectRatio: "1:1" },
  { id: "instagram-story", platform: "Instagram", variant: "Story", width: 1080, height: 1920, aspectRatio: "9:16" },
  { id: "youtube-thumbnail", platform: "YouTube", variant: "Thumbnail", width: 1280, height: 720, aspectRatio: "16:9" },
  { id: "facebook-feed", platform: "Facebook", variant: "Feed", width: 1200, height: 630, aspectRatio: "1.91:1" },
  { id: "linkedin-banner", platform: "LinkedIn", variant: "Banner", width: 1128, height: 191, aspectRatio: "5.9:1" },
  { id: "tiktok-vertical", platform: "TikTok", variant: "Vertical", width: 1080, height: 1920, aspectRatio: "9:16" }
];

export const MAX_VARIANTS_PER_REQUEST = 10;
export const MAX_INPUT_DIMENSION = 6000;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"];

export function getVariantLabel(variant: SocialVariant): string {
  return `${variant.platform} ${variant.variant} (${variant.width}×${variant.height})`;
}

export function getVariantById(id: string): SocialVariant | undefined {
  return SOCIAL_VARIANTS.find(v => v.id === id);
}

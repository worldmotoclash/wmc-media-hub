export interface SocialVariant {
  id: string;
  platform: string;
  variant: string;
  width: number;
  height: number;
  aspectRatio: string;
}

export const SOCIAL_VARIANTS: SocialVariant[] = [
  // Instagram (4 variants)
  { id: "instagram-feed-square", platform: "Instagram", variant: "Feed Square", width: 1080, height: 1080, aspectRatio: "1:1" },
  { id: "instagram-feed-portrait", platform: "Instagram", variant: "Feed Portrait", width: 1080, height: 1350, aspectRatio: "4:5" },
  { id: "instagram-feed-landscape", platform: "Instagram", variant: "Feed Landscape", width: 1080, height: 566, aspectRatio: "1.91:1" },
  { id: "instagram-story", platform: "Instagram", variant: "Story/Reels Cover", width: 1080, height: 1920, aspectRatio: "9:16" },
  
  // Facebook (3 variants)
  { id: "facebook-feed", platform: "Facebook", variant: "Feed", width: 1200, height: 630, aspectRatio: "1.91:1" },
  { id: "facebook-event", platform: "Facebook", variant: "Event Cover", width: 1920, height: 1080, aspectRatio: "16:9" },
  { id: "facebook-story", platform: "Facebook", variant: "Story", width: 1080, height: 1920, aspectRatio: "9:16" },
  
  // X / Twitter (2 variants)
  { id: "twitter-post", platform: "X / Twitter", variant: "Post Image", width: 1600, height: 900, aspectRatio: "16:9" },
  { id: "twitter-header", platform: "X / Twitter", variant: "Header Banner", width: 1500, height: 500, aspectRatio: "3:1" },
  
  // LinkedIn (2 variants)
  { id: "linkedin-feed", platform: "LinkedIn", variant: "Feed Image", width: 1200, height: 627, aspectRatio: "1.91:1" },
  { id: "linkedin-company", platform: "LinkedIn", variant: "Company Cover", width: 1128, height: 191, aspectRatio: "5.9:1" },
  
  // YouTube (2 variants)
  { id: "youtube-thumbnail", platform: "YouTube", variant: "Thumbnail", width: 1280, height: 720, aspectRatio: "16:9" },
  { id: "youtube-channel", platform: "YouTube", variant: "Channel Art", width: 2560, height: 1440, aspectRatio: "16:9" },
  
  // TikTok (1 variant)
  { id: "tiktok-feed", platform: "TikTok", variant: "Feed/Story/Carousel", width: 1080, height: 1920, aspectRatio: "9:16" },
];

export const MAX_VARIANTS_PER_REQUEST = 14;
export const MAX_INPUT_DIMENSION = 6000;
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"];

export function getVariantLabel(variant: SocialVariant): string {
  return `${variant.platform} ${variant.variant} (${variant.width}×${variant.height})`;
}

export function getVariantById(id: string): SocialVariant | undefined {
  return SOCIAL_VARIANTS.find(v => v.id === id);
}

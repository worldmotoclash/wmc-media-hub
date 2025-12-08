export interface SocialVariant {
  id: string;
  platform: string;
  variant: string;
  width: number;
  height: number;
  aspectRatio: string;
  filename: string;
}

export const SOCIAL_VARIANTS: SocialVariant[] = [
  // Instagram (4 variants)
  { id: "instagram-feed-square", platform: "Instagram", variant: "Feed Square", width: 1080, height: 1080, aspectRatio: "1:1", filename: "ig-square.jpg" },
  { id: "instagram-feed-portrait", platform: "Instagram", variant: "Feed Portrait", width: 1080, height: 1350, aspectRatio: "4:5", filename: "ig-portrait.jpg" },
  { id: "instagram-feed-landscape", platform: "Instagram", variant: "Feed Landscape", width: 1080, height: 566, aspectRatio: "1.91:1", filename: "ig-landscape.jpg" },
  { id: "instagram-story", platform: "Instagram", variant: "Story/Reels Cover", width: 1080, height: 1920, aspectRatio: "9:16", filename: "ig-story-super.jpg" },
  
  // Facebook (3 variants)
  { id: "facebook-feed", platform: "Facebook", variant: "Feed", width: 1200, height: 630, aspectRatio: "1.91:1", filename: "fb-feed.jpg" },
  { id: "facebook-event", platform: "Facebook", variant: "Event Cover", width: 1920, height: 1080, aspectRatio: "16:9", filename: "fb-event.jpg" },
  { id: "facebook-story", platform: "Facebook", variant: "Story", width: 1080, height: 1920, aspectRatio: "9:16", filename: "fb-story-super.jpg" },
  
  // X / Twitter (2 variants)
  { id: "twitter-post", platform: "X / Twitter", variant: "Post Image", width: 1600, height: 900, aspectRatio: "16:9", filename: "twitter-post.jpg" },
  { id: "twitter-header", platform: "X / Twitter", variant: "Header Banner", width: 1500, height: 500, aspectRatio: "3:1", filename: "twitter-header.jpg" },
  
  // LinkedIn (2 variants)
  { id: "linkedin-feed", platform: "LinkedIn", variant: "Feed Image", width: 1200, height: 627, aspectRatio: "1.91:1", filename: "linkedin-feed.jpg" },
  { id: "linkedin-company", platform: "LinkedIn", variant: "Company Cover", width: 1128, height: 191, aspectRatio: "5.9:1", filename: "linkedin-cover.jpg" },
  
  // YouTube (2 variants)
  { id: "youtube-thumbnail", platform: "YouTube", variant: "Thumbnail", width: 1280, height: 720, aspectRatio: "16:9", filename: "youtube-thumb.jpg" },
  { id: "youtube-channel", platform: "YouTube", variant: "Channel Art", width: 2560, height: 1440, aspectRatio: "16:9", filename: "youtube-channel.jpg" },
  
  // TikTok (1 variant)
  { id: "tiktok-feed", platform: "TikTok", variant: "Feed/Story/Carousel", width: 1080, height: 1920, aspectRatio: "9:16", filename: "tiktok-super.jpg" },
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

export function getVariantFilename(variant: SocialVariant): string {
  return variant.filename;
}

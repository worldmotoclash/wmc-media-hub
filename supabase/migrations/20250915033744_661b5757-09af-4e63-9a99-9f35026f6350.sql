-- Add provider column to video_generations table to support multiple AI providers
ALTER TABLE public.video_generations 
ADD COLUMN provider text NOT NULL DEFAULT 'veo';

-- Add comment to document the provider column
COMMENT ON COLUMN public.video_generations.provider IS 'AI provider used for video generation (veo, wavespeed)';

-- Add index for better performance when filtering by provider
CREATE INDEX idx_video_generations_provider ON public.video_generations (provider);

-- Update existing records to have provider = 'veo' (they are already VEO-generated)
UPDATE public.video_generations SET provider = 'veo' WHERE provider IS NULL;
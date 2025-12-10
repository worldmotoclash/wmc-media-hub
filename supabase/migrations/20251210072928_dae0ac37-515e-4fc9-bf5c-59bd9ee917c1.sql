-- Add missing columns to media_assets for social variant tracking
ALTER TABLE public.media_assets 
ADD COLUMN IF NOT EXISTS platform text,
ADD COLUMN IF NOT EXISTS variant_name text;

-- Add index for efficient querying of variants by master
CREATE INDEX IF NOT EXISTS idx_media_assets_master_id ON public.media_assets(master_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_platform ON public.media_assets(platform);
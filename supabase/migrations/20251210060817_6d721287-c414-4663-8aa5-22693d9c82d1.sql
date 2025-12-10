-- Add missing columns for master image uploads
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS asset_type text;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS s3_key text;
ALTER TABLE public.media_assets ADD COLUMN IF NOT EXISTS salesforce_id text;

-- Add index for faster Salesforce lookups
CREATE INDEX IF NOT EXISTS idx_media_assets_salesforce_id ON public.media_assets(salesforce_id);
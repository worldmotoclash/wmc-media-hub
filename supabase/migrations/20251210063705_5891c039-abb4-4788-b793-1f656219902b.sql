-- Add master_id column to media_assets for linking variants to master images
ALTER TABLE public.media_assets 
ADD COLUMN IF NOT EXISTS master_id text;
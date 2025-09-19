-- Update s3_bucket_configs table to support non-authenticated usage
-- Make access_key_id nullable since we won't use user-provided credentials
ALTER TABLE public.s3_bucket_configs 
ALTER COLUMN access_key_id DROP NOT NULL;

-- Make created_by nullable to support non-authenticated usage
ALTER TABLE public.s3_bucket_configs 
ALTER COLUMN created_by DROP NOT NULL;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "All authenticated users can view S3 bucket configs" ON public.s3_bucket_configs;
DROP POLICY IF EXISTS "Users can create their own S3 bucket configs" ON public.s3_bucket_configs;
DROP POLICY IF EXISTS "Users can update their own S3 bucket configs" ON public.s3_bucket_configs;
DROP POLICY IF EXISTS "Users can delete their own S3 bucket configs" ON public.s3_bucket_configs;

-- Create new public RLS policies for admin functionality
CREATE POLICY "Anyone can view S3 bucket configs" 
ON public.s3_bucket_configs 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create S3 bucket configs" 
ON public.s3_bucket_configs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update S3 bucket configs" 
ON public.s3_bucket_configs 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete S3 bucket configs" 
ON public.s3_bucket_configs 
FOR DELETE 
USING (true);
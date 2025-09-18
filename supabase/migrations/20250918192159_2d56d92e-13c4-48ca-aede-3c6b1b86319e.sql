-- Add created_by column to s3_bucket_configs table to track which user created each configuration
ALTER TABLE public.s3_bucket_configs 
ADD COLUMN created_by UUID;

-- Update RLS policies to allow users to manage their own configurations and admins to see all
DROP POLICY IF EXISTS "Authenticated users can manage S3 bucket configs" ON public.s3_bucket_configs;
DROP POLICY IF EXISTS "S3 bucket configs are viewable by authenticated users" ON public.s3_bucket_configs;

-- Users can view their own S3 bucket configs
CREATE POLICY "Users can view their own S3 bucket configs" 
ON public.s3_bucket_configs 
FOR SELECT 
USING (created_by = auth.uid());

-- Users can create S3 bucket configs with their own user ID
CREATE POLICY "Users can create their own S3 bucket configs" 
ON public.s3_bucket_configs 
FOR INSERT 
WITH CHECK (created_by = auth.uid());

-- Users can update their own S3 bucket configs
CREATE POLICY "Users can update their own S3 bucket configs" 
ON public.s3_bucket_configs 
FOR UPDATE 
USING (created_by = auth.uid());

-- Users can delete their own S3 bucket configs
CREATE POLICY "Users can delete their own S3 bucket configs" 
ON public.s3_bucket_configs 
FOR DELETE 
USING (created_by = auth.uid());
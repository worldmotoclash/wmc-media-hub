-- Fix security issue: Remove access_key_id column and restrict access to authenticated users
-- Since we're using global credentials, we don't need to store user credentials at all

-- Remove the access_key_id column entirely since we're not using it
ALTER TABLE public.s3_bucket_configs DROP COLUMN IF EXISTS access_key_id;

-- Drop existing public RLS policies 
DROP POLICY IF EXISTS "Anyone can view S3 bucket configs" ON public.s3_bucket_configs;
DROP POLICY IF EXISTS "Anyone can create S3 bucket configs" ON public.s3_bucket_configs;
DROP POLICY IF EXISTS "Anyone can update S3 bucket configs" ON public.s3_bucket_configs;
DROP POLICY IF EXISTS "Anyone can delete S3 bucket configs" ON public.s3_bucket_configs;

-- Create secure RLS policies that require authentication
CREATE POLICY "Authenticated users can view S3 bucket configs" 
ON public.s3_bucket_configs 
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create S3 bucket configs" 
ON public.s3_bucket_configs 
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update S3 bucket configs" 
ON public.s3_bucket_configs 
FOR UPDATE 
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete S3 bucket configs" 
ON public.s3_bucket_configs 
FOR DELETE 
TO authenticated  
USING (true);
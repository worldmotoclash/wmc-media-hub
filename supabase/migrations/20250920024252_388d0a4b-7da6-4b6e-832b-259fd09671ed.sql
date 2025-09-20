-- Drop the created_by column from s3_bucket_configs table
ALTER TABLE public.s3_bucket_configs DROP COLUMN created_by;

-- Update RLS policies to not reference created_by field
DROP POLICY IF EXISTS "Authenticated users can create S3 bucket configs" ON public.s3_bucket_configs;
DROP POLICY IF EXISTS "Authenticated users can view S3 bucket configs" ON public.s3_bucket_configs;
DROP POLICY IF EXISTS "Authenticated users can update S3 bucket configs" ON public.s3_bucket_configs;
DROP POLICY IF EXISTS "Authenticated users can delete S3 bucket configs" ON public.s3_bucket_configs;

-- Create new simplified RLS policies
CREATE POLICY "Authenticated users can create S3 bucket configs" 
ON public.s3_bucket_configs 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view S3 bucket configs" 
ON public.s3_bucket_configs 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update S3 bucket configs" 
ON public.s3_bucket_configs 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete S3 bucket configs" 
ON public.s3_bucket_configs 
FOR DELETE 
USING (auth.uid() IS NOT NULL);
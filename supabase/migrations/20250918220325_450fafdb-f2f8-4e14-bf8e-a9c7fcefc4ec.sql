-- Update RLS policy for s3_bucket_configs to allow all authenticated users to view configurations
DROP POLICY IF EXISTS "Users can view their own S3 bucket configs" ON public.s3_bucket_configs;

-- Create new policy allowing all authenticated users to view S3 bucket configurations
CREATE POLICY "All authenticated users can view S3 bucket configs" 
ON public.s3_bucket_configs 
FOR SELECT 
TO authenticated
USING (true);

-- Keep the existing INSERT/UPDATE/DELETE policies user-specific for now
-- Users can still create/modify their own configs, but all users can see all configs
-- Drop the existing restrictive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view S3 bucket configs" ON s3_bucket_configs;

-- Create a new public SELECT policy (configs are not sensitive - just bucket names/endpoints)
CREATE POLICY "S3 bucket configs are publicly viewable" 
ON s3_bucket_configs 
FOR SELECT 
USING (true);
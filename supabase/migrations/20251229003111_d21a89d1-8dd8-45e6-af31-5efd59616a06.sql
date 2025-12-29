-- Add CDN base URL column to s3_bucket_configs table
ALTER TABLE s3_bucket_configs 
ADD COLUMN cdn_base_url TEXT;

COMMENT ON COLUMN s3_bucket_configs.cdn_base_url IS 
'Optional CDN base URL to use instead of the raw S3 endpoint. Example: https://media.worldmotoclash.com';
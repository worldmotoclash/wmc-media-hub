-- Backfill missing s3_key for S3-bucket assets so search/filtering works
update public.media_assets
set s3_key = source_id,
    updated_at = now()
where source = 's3_bucket'
  and s3_key is null
  and source_id is not null;

-- Optional: keep source_id and s3_key aligned going forward for S3-bucket rows
-- (No trigger added here to keep migration minimal.)
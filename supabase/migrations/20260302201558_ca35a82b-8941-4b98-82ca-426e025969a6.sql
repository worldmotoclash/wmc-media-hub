
-- Step 1: Delete historical duplicate s3_bucket rows, keeping the newest per dedupe key
DELETE FROM media_assets
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY coalesce(nullif(trim(s3_key), ''), nullif(trim(source_id), ''), nullif(trim(file_url), ''))
             ORDER BY
               -- prefer non-s3_bucket sources
               CASE WHEN source = 's3_bucket' THEN 1 ELSE 0 END,
               -- then newest
               created_at DESC
           ) AS rn
    FROM media_assets
    WHERE coalesce(nullif(trim(s3_key), ''), nullif(trim(source_id), ''), nullif(trim(file_url), '')) IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Step 2: Add partial unique index to prevent future s3_bucket duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_assets_s3_bucket_unique_key
ON media_assets (s3_key)
WHERE source = 's3_bucket' AND s3_key IS NOT NULL;

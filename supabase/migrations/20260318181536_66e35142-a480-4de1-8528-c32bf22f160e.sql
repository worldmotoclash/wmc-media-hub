-- Backfill: assign existing S3 assets to their correct albums based on folder path
UPDATE media_assets ma
SET album_id = sub.album_id
FROM (
  SELECT DISTINCT ON (ma2.id) ma2.id AS asset_id, al.id AS album_id
  FROM media_assets ma2
  JOIN media_albums al ON al.wasabi_path IS NOT NULL
    AND ma2.s3_key LIKE al.wasabi_path || '/%'
  WHERE ma2.source = 's3_bucket'
    AND ma2.album_id IS NULL
  ORDER BY ma2.id, length(al.wasabi_path) DESC
) sub
WHERE ma.id = sub.asset_id;

-- Refresh album asset counts
UPDATE media_albums al
SET asset_count = (
  SELECT COUNT(*) FROM media_assets WHERE album_id = al.id
);
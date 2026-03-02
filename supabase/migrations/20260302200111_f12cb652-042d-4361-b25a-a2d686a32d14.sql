DELETE FROM media_assets
WHERE id IN (
  SELECT s3_dup.id
  FROM media_assets s3_dup
  INNER JOIN media_assets upload_orig
    ON s3_dup.s3_key = upload_orig.s3_key
  WHERE s3_dup.source = 's3_bucket'
    AND upload_orig.source = 'local_upload'
    AND s3_dup.s3_key IS NOT NULL
);
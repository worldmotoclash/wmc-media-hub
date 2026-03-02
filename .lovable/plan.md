

# Clean Up Existing Duplicate Records

The bug has been creating duplicates where the same S3 file exists as both a `source = 'local_upload'` record and a `source = 's3_bucket'` record with the same `s3_key`. We can identify and remove these with a SQL query.

## Approach

Run a SQL query that:
1. Finds all `s3_key` values that appear in both a `local_upload` record and an `s3_bucket` record
2. Deletes the `s3_bucket` duplicate (keeping the original `local_upload` record)

## SQL to Execute

```sql
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
```

## Steps

1. First run a **read-only count query** to see how many duplicates exist, so you can confirm before deleting
2. Then run the delete query to remove the `s3_bucket` duplicates

No code or schema changes needed -- this is a one-time data cleanup using the Supabase SQL editor or the insert tool.


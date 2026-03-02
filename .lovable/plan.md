

# Why Two Records Appear After Image Upload

## Root Cause

When you upload an image, two different systems each create their own `media_assets` record for the same file:

1. **Upload function** (`upload-master-to-s3`): Creates a record with `source = 'local_upload'` and stores the S3 path in the `s3_key` column.
2. **S3 scanner** (`scan-s3-buckets`): Later discovers the same file in S3 and creates a **second** record with `source = 's3_bucket'`, using the `source_id` column for the S3 path.

The scanner checks for duplicates by looking up `source_id` where `source = 's3_bucket'`, so it never finds the record created by the upload function (which uses different values for both fields). Result: duplicate.

## Fix

### `supabase/functions/scan-s3-buckets/index.ts`

Expand the duplicate-detection logic to also check the `s3_key` column before inserting a new record. Before the insert at ~line 488, add a fallback lookup:

```typescript
// If no match by source_id, check s3_key (catches records from upload-master-to-s3)
if (!existingAsset?.id) {
  const { data: byS3Key } = await supabase
    .from('media_assets')
    .select('id')
    .eq('s3_key', obj.Key)
    .maybeSingle();
  if (byS3Key) {
    // Already exists via upload — skip or update, don't insert
    skippedMedia++;
    continue;
  }
}
```

This is a single change in one file. No UI or schema changes needed.


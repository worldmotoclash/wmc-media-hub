

# Backfill Album Assignments for Existing Wasabi Assets

## Problem

Albums were created from the Wasabi S3 folder structure, but existing video assets in the database don't have their `album_id` set. The scan logic includes auto-album assignment, but it only works during an active scan — and many assets were imported before the album feature existed. Even on re-scan, the ETag-skip path assigns albums one-by-one which may have timed out or errored silently.

## Root Cause

The `scan-s3-buckets` edge function creates albums and assigns `album_id` during scanning, but:
1. Assets imported before the album feature have no `album_id` and matching ETags, so they rely on a per-asset update inside the skip path (lines 462-486) which can time out on large buckets.
2. Album names are derived from the S3 key's folder structure using `deriveAlbumName()`, and albums store the `wasabi_path`. We can use this to do a bulk backfill.

## Solution

Create and deploy an updated `scan-s3-buckets` function that performs album backfill more reliably, **plus** a one-time SQL backfill that bulk-assigns existing assets to albums by matching their `s3_key` folder path against the album's `wasabi_path`.

### Step 1: SQL Backfill Migration

Run a database migration that matches unassigned `media_assets` (where `album_id IS NULL` and `source = 's3_bucket'`) to `media_albums` by checking if the asset's `s3_key` starts with the album's `wasabi_path`. This handles the bulk of the work in a single query.

```sql
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
```

The `ORDER BY length(wasabi_path) DESC` with `DISTINCT ON` ensures each asset matches its most specific (deepest) album folder.

### Step 2: Update Album Asset Counts

After the backfill, refresh the `asset_count` on each album:

```sql
UPDATE media_albums al
SET asset_count = (
  SELECT COUNT(*) FROM media_assets WHERE album_id = al.id
);
```

This is a two-step SQL migration — no edge function changes needed. All existing videos will be connected to their correct albums based on their Wasabi folder paths.


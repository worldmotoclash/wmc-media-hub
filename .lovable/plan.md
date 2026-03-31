

# Fix: S3 Scan Does Not Sync to Salesforce + Duplicates from Grid Extracts

## Problems

1. **Scan doesn't sync to SFDC**: The `scan-s3-buckets` edge function creates/updates `media_assets` records but never triggers `sync-asset-to-salesforce`. New S3 files only get Salesforce records if manually synced.

2. **Grid extract duplicates**: Files like "Grid Extract - Middle Center (2,2)" were already synced to Salesforce by the `extract-grid-image` function at creation time. But when `scan-s3-buckets` later finds the same file in S3, it creates a new `media_assets` record (source=`s3_bucket`) alongside the original (source=`generated`). The scan's dedup only checks `source='s3_bucket'` records, so it doesn't see the existing `generated` record with the same `s3_key`.

## Changes

### 1. `supabase/functions/scan-s3-buckets/index.ts` — Skip files that already exist under any source

**Lines 546-556**: The scan checks for existing records by `s3_key` but only after the `existingAsset` check (which is scoped to `source='s3_bucket'`). The `byS3Key` lookup at line 547 doesn't filter by source, which should catch duplicates — but it uses `.maybeSingle()` which can fail if there are multiple matches. More importantly, the `existingAssetMap` is built from `source='s3_bucket'` only (line 422), so the first fast-path check misses `generated` records.

Fix the `existingAssetsWithMetadata` query (line 419-422) to also include records with matching `s3_key` regardless of source, OR change the dedup lookup at line 547 to be the primary check before the ETag path.

**Concrete change**: Remove the `.eq('source', 's3_bucket')` filter from the pre-fetch query at line 422, so the `existingAssetMap` includes all records with an `s3_key`. This way, files already tracked as `generated` or `local_upload` will be found and skipped/updated instead of duplicated.

### 2. `supabase/functions/scan-s3-buckets/index.ts` — Auto-sync new assets to Salesforce

After the scan completes and new assets are created, collect all `newAsset` IDs and call `sync-asset-to-salesforce` for them. This happens inside the `runScan()` background function.

**Concrete change** (~15 lines added after line 629):
- Collect new asset IDs during the scan loop into a `newAssetIds: string[]` array
- After the scan loop completes, if `newAssetIds.length > 0`, invoke `sync-asset-to-salesforce` via internal fetch with those IDs
- This ensures every new S3 file gets a Salesforce record automatically

### 3. Cleanup existing duplicates (optional background task)

The scan already created duplicates for grid extracts. The next scan will skip them once fix #1 is in place, but existing duplicates remain. We can add a one-time dedup step: if two records share the same `s3_key`, keep the one with `source='generated'` (or the one that has a `salesforce_id`) and delete the other.

**Concrete change**: Add dedup logic at the start of `runScan()` — query for records grouped by `s3_key` having count > 1, then delete the `s3_bucket` duplicate.

## Summary

| File | Change |
|------|--------|
| `supabase/functions/scan-s3-buckets/index.ts` | Remove source filter from dedup query; collect new IDs; auto-call sync-asset-to-salesforce; dedup existing duplicates |

Two root causes, one file changed.


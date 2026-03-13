

# Fix: Auto-Album Creation for Existing Assets

## Problem
The album auto-creation logic (line 560) only runs when `isNewAsset` is `true`. Since all your S3 files were already imported in prior scans before this feature was added, they match as existing assets via ETag comparison and are skipped. No new assets means no album creation triggers.

## Solution
Move the auto-album assignment logic so it runs for **all** assets (new and existing) that don't already have an `album_id`, not just newly imported ones.

### Changes

**File: `supabase/functions/scan-s3-buckets/index.ts`**

1. Pre-fetch existing assets' `album_id` alongside their metadata (line ~419-430) so we know which ones are unassigned
2. Change the album assignment condition from `if (assetId && isNewAsset)` to `if (assetId && !existingAlbumId)` — this ensures:
   - New assets get albums (as before)
   - Existing assets that were imported before the album feature also get assigned
   - Assets already assigned to an album are left alone
3. For skipped (ETag-unchanged) assets, still check if they need album assignment

### Detailed changes

| Location | Change |
|----------|--------|
| Line ~419-422 | Add `album_id` to the existing assets SELECT query |
| Line ~424-430 | Store `album_id` in the `existingAssetMap` entries |
| Line ~459-464 | For ETag-skipped assets, still run album assignment if `album_id` is null |
| Line ~560 | Change condition from `isNewAsset` to checking whether asset lacks an album |

This is a single-file change. After deploying, re-running a scan will assign albums to all existing unassigned assets.


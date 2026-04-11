
## Diagnosis

The bulk uploads are failing to sync because the bulk flow is sending the wrong ID to Salesforce-related edge functions.

### Root cause
In `src/components/media/BulkUploadTab.tsx`, the upload flow stores and reuses `presignData.masterId` after finalize:

- it sends `presignData.masterId` to `auto-tag-media-asset`
- it saves `presignData.masterId` into `QueuedFile.assetId`
- it later sends those same values to `sync-asset-to-salesforce`

But both edge functions expect the real `media_assets.id`, not the presigned upload `masterId`.

### Evidence from the code/logs
- `upload-master-to-s3` creates a database row and returns `assetId: assetData.id`
- `sync-asset-to-salesforce` queries `media_assets` with the provided IDs
- the logs show:
  - `upload-master-to-s3` created `media_assets` record `f21c8f53-...`
  - `sync-asset-to-salesforce` was called with `3794686b-...`
  - `auto-tag-media-asset` also tried `3794686b-...` and hit a foreign key error because that ID is not in `media_assets`

That explains the toast:
`SFDC sync failed → Edge Function returned a non-2xx status code`

The edge function is returning 404 because it cannot find any `media_assets` row for the master ID.

## What to change

### 1. Fix `BulkUploadTab.tsx`
Update the bulk upload flow to use the finalize response from `upload-master-to-s3`:

- capture `data.assetId` from the finalize call
- pass `data.assetId` to `auto-tag-media-asset`
- store `data.assetId` in the queue item instead of `presignData.masterId`
- build the bulk sync list from those real asset IDs

Also pass `creatorContactId: user?.id` into the finalize request for consistency with the other upload flows.

### 2. Clean up the follow-up sync step
Right now bulk upload does two SFDC-related steps:
1. `upload-master-to-s3` already creates the SFDC record and marks it `pending_id`
2. bulk upload then immediately calls `sync-asset-to-salesforce` again

That second call is risky because Salesforce ID resolution is asynchronous. Safer options:

- preferred: after bulk upload, call `backfill-salesforce-ids` to resolve pending IDs
- minimum fix: keep the current post-upload sync, but use the correct `assetId`s so it no longer 404s

### 3. Verify after implementation
Test one small bulk upload and confirm:

- no more 404/non-2xx sync toast
- `auto-tag-media-asset` logs reference the real `media_assets.id`
- assets move from pending to resolved SFDC IDs
- no FK errors in `media_asset_tags`

## Files involved

- `src/components/media/BulkUploadTab.tsx` — main fix
- optionally reuse existing pending-ID UI patterns from `src/components/media/MediaAssetDetailsDrawer.tsx`
- no database migration required

## Technical details

- Wrong ID currently used: `presignData.masterId`
- Correct ID to use: `upload-master-to-s3` response `data.assetId`
- Why it fails: `sync-asset-to-salesforce` does `.from("media_assets").in("id", assetIds)` and the master IDs are not rows in that table

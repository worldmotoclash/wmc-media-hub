

# Fix: Drawer Not Reflecting SFDC Sync Results

## Root Cause

After "Sync to SFDC" succeeds, the `onAssetUpdated` callback in `UnifiedMediaLibrary.tsx` calls `loadAssets()` then a second `fetchAllMediaAssets()` to refresh the drawer. This has two problems:

1. **Race condition**: The edge function returns a response that includes the `salesforceId` and status, but the drawer ignores this response and instead re-fetches from the DB — which may not reflect the update yet due to timing.
2. **Double fetch**: Two full `fetchAllMediaAssets()` calls (one in `loadAssets`, one to find the updated asset) are wasteful and slow.

## Fix

### 1. `MediaAssetDetailsDrawer.tsx` — Use sync response to update local state immediately

The "Sync to SFDC" button already calls `supabase.functions.invoke('sync-asset-to-salesforce')` which returns `results[]` containing `salesforceId` and `action`. After a successful sync:
- Read the `salesforceId` from the response
- Set `localStatus` to `'Pending'` (the governance default)
- Update a new `localSalesforceId` state so the drawer immediately shows "Synced" badge and the SFDC ID
- Still call `onAssetUpdated?.()` for background refresh of the grid

Changes:
- Add `localSalesforceId` state, initialized from `asset.salesforceId`, synced via the existing `useEffect`
- Replace `asset.salesforceId` references in the drawer with `localSalesforceId`
- After sync success, parse response and set `localSalesforceId` + `localStatus`

### 2. `MediaAssetDetailsDrawer.tsx` — Status dropdown guard fix

Currently the status dropdown only shows when `asset.salesforceId` is truthy. After sync, until `onAssetUpdated` refreshes the prop, the dropdown stays hidden. Using `localSalesforceId` instead fixes this — the dropdown appears immediately after sync.

## Files Changed

| File | Change |
|------|--------|
| `src/components/media/MediaAssetDetailsDrawer.tsx` | Add `localSalesforceId` state; use it for sync badge, SFDC ID display, and status dropdown guard; parse sync response to update both local states immediately |

One file, ~15 lines changed.


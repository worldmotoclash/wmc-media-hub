

# Add "Retry All SFDC Sync" Button

## What
Add a button to the media library toolbar that syncs **all** assets missing a `salesforce_id` to Salesforce in one click — not just selected ones.

## Where
The `MediaSourceDashboard` component already has a "Sync to SFDC" button inside the collapsible panel, but it's hidden when collapsed. We'll add a prominent "Retry All" button in two places:

1. **MediaSourceDashboard collapsed summary** — show a "Retry All" button next to the issues badge when the panel is collapsed and there are missing SFDC records
2. **Bulk Action Bar in UnifiedMediaLibrary** — add a "Sync to SFDC" button when selected assets include any without a `salesforce_id`

## Changes

### 1. `src/components/media/MediaSourceDashboard.tsx`
- In the collapsed header (around line 130), when `syncHealth.missingSfdc > 0`, add a "Retry All" button next to the issues badge
- Button calls existing `handleSyncMissing()` — no new logic needed
- Style: small outline button with `CloudUpload` icon, stops event propagation so it doesn't toggle the collapsible

### 2. `src/components/media/UnifiedMediaLibrary.tsx`
- In the Bulk Action Bar (line 1271), add a "Sync to SFDC" button that syncs selected assets missing `salesforce_id`
- Filter `selectedAssetIds` to those where `salesforce_id` is null, invoke `sync-asset-to-salesforce` with those IDs
- Add state for `isBulkSyncing` to show spinner
- After sync completes, refresh the asset list

## Files Changed

| File | Change |
|------|--------|
| `src/components/media/MediaSourceDashboard.tsx` | Add "Retry All" button in collapsed header |
| `src/components/media/UnifiedMediaLibrary.tsx` | Add "Sync to SFDC" button in bulk action bar for selected unsynced assets |


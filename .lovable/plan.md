# Fix Status Badge Readability + Drawer Not Refreshing After Sync

## Problems

1. **Status badges are hard to read** — they use transparent backgrounds (`bg-green-500/10`) with colored text. User wants solid color backgrounds with white text.
2. **"Sync to SFDC" doesn't update the drawer** — After syncing, `onAssetUpdated()` triggers `loadAssets()` which refetches the asset list, but `detailsAsset` (the state variable passed to the drawer) is never updated. The drawer keeps showing stale data: no `salesforce_id`, status still says "Not synced".

## Changes

### 1. Solid status badges — multiple files

Update `getStatusColor` to return solid backgrounds with white text:


| Status   | Current                            | New                        |
| -------- | ---------------------------------- | -------------------------- |
| Approved | `bg-green-500/10 text-green-600`   | `bg-green-600 text-white`  |
| Pending  | `bg-yellow-500/10 text-yellow-600` | `bg-yellow-600 text-white` |
| Rejected | `bg-red-500/10 text-red-600`       | `bg-red-600 text-white`    |
| default  | `bg-gray-500/10 text-gray-600`     | `bg-gray-600 text-white`   |


Apply in:

- `src/components/media/UnifiedMediaLibrary.tsx` — grid and list view badges
- `src/components/media/ImagePreviewModal.tsx` — image preview badge

### 2. Refresh drawer after sync — `UnifiedMediaLibrary.tsx`

In the `onAssetUpdated` callback passed to `MediaAssetDetailsDrawer`, after `loadAssets()` completes, find the updated asset in the refreshed list and call `setDetailsAsset(updatedAsset)` so the drawer reflects the new `salesforce_id` and status.

Change the callback from:

```ts
onAssetUpdated={() => {
  loadAssets();
  loadFilterCounts();
}}
```

To an async function that awaits `loadAssets`, then updates `detailsAsset` from the refreshed `assets` array by matching on `id`.

### 3. Refresh drawer after sync — `MediaAssetDetailsDrawer.tsx`

After the "Sync to SFDC" button succeeds, the drawer currently calls `onAssetUpdated?.()` but the drawer itself doesn't re-read the asset. Since fix #2 above will update the `asset` prop, the existing `useEffect` on `asset` will handle re-syncing local state. No additional change needed here.

## Files Changed


| File                                           | Change                                                               |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| `src/components/media/UnifiedMediaLibrary.tsx` | Solid status badge colors; refresh `detailsAsset` after `loadAssets` |
| `src/components/media/ImagePreviewModal.tsx`   | Solid status badge colors                                            |

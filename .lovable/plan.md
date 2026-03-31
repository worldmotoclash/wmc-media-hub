

# Fix Status Consistency and Add Editable Status

## Problems

1. **"Review" button only appears for `pending` assets** — by design, but `ready` is not a recognized status in the system (`pending`, `approved`, `rejected` are). The "WMC SIZZLE MEDIA PITCH VER 8" was likely created with status `ready` by the S3 scan or bulk upload, which is outside the expected values.

2. **Status is not editable** — there is no way to change an asset's status from the card view or the details drawer. The only way to move from `pending` to `approved` is via the Review/Librarian workflow dialog.

## Changes

### 1. Normalize `ready` status to `approved` — `supabase/functions/scan-s3-buckets/index.ts`
When the scan creates new `media_assets` records, ensure status is set to `pending` (not `ready`). Also add `ready` to `getStatusColor` as an alias for `approved` styling so existing records display correctly.

### 2. Add status dropdown to `MediaAssetDetailsDrawer.tsx`
In the details drawer, add an editable status selector (a `Select` dropdown) with options: `pending`, `approved`, `rejected`. On change, update the `media_assets` record and call `onAssetUpdated()`. This gives users a quick way to change status without going through the full Review workflow.

### 3. Include `ready` in status filter and color map — `UnifiedMediaLibrary.tsx`
- Add `case 'ready':` to `getStatusColor` mapping it to the same green as `approved`
- Add `ready` to the status filter checkbox list, or normalize it on fetch

### 4. Show Review button for all non-approved statuses — `UnifiedMediaLibrary.tsx`
Change `asset.status === 'pending'` to `asset.status !== 'approved'` so assets with `ready` or other unexpected statuses also get the Review button.

## Files Changed

| File | Change |
|------|--------|
| `src/components/media/UnifiedMediaLibrary.tsx` | Add `ready` to status color map; show Review for non-approved statuses; add `ready` to filter list |
| `src/components/media/MediaAssetDetailsDrawer.tsx` | Add status dropdown selector with save logic |
| `supabase/functions/scan-s3-buckets/index.ts` | Ensure new assets use `pending` not `ready` |


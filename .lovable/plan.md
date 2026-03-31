# Fix: Status Dropdown Not Updating After Save

## Problem

The `Select` dropdown uses `asset.status` (a prop) as its value. After the DB update succeeds and `onAssetUpdated?.()` is called, the parent refetches data — but the prop-driven value doesn't reflect the change until the drawer is re-opened or the parent finishes its async refetch. The dropdown visually stays on the old value.

## Fix

`**src/components/media/MediaAssetDetailsDrawer.tsx**`

1. Add a `localStatus` state variable initialized from `asset.status`, synced via `useEffect` when `asset` changes.
2. Change the `Select` value to use `localStatus` instead of `asset.status`.
3. On successful save, update `localStatus` immediately (optimistic update) before calling `onAssetUpdated?.()`.

~5 lines added/changed. Same file only.   

And SFDC show Pending? Not Ready or Approved?
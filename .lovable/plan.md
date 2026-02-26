

# Fix Album Filter in Media Library

## Problem
The album filter dropdown already exists in the Unified Media Library UI, but it doesn't work correctly. The filtering happens **client-side** on the already-paginated 20-result page (line 383-386 of `UnifiedMediaLibrary.tsx`). If the album's assets aren't on the current page, they won't appear. This needs to be a server-side (Supabase query) filter.

## Changes

### 1. `src/services/unifiedMediaService.ts`

- Add `albumId?: string` to the `SearchFilters` interface
- In `fetchAllMediaAssets`, apply `.eq('album_id', filters.albumId)` to the Supabase query when the filter is set — this ensures pagination and count are correct

### 2. `src/components/media/UnifiedMediaLibrary.tsx`

- Remove the broken client-side album filter block (lines 383-387) that filters `assetsData` after fetch
- Instead, pass `selectedAlbumId` into the `filters` object so the service layer handles it server-side
- Remove the separate `selectedAlbumId` state tracking in the `useEffect` dependency — it will be part of `filters`
- Keep the existing album dropdown UI as-is (it already looks good)
- Call `loadAlbums()` after search/filter changes to keep the list fresh (or just on mount, which it already does)

### Result
Selecting an album will correctly query only assets with that `album_id` from Supabase, with proper pagination and total count.

## Files Modified

| File | Change |
|------|--------|
| `src/services/unifiedMediaService.ts` | Add `albumId` to `SearchFilters`, apply `.eq('album_id')` in query |
| `src/components/media/UnifiedMediaLibrary.tsx` | Remove client-side album filter, pass albumId through filters object |


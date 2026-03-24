

# Fix Album Counts and Remove Empty Albums

## Problem
The `asset_count` column on `media_albums` is manually maintained and drifts out of sync with reality. Albums with zero actual assets still appear in the dropdown.

## Changes

### 1. `src/components/media/UnifiedMediaLibrary.tsx` — `loadAlbums()`
Replace the current query that reads the stale `asset_count` column with a two-step approach:
- Fetch all albums
- For each album, query the actual count from `media_assets` where `album_id` matches
- Filter out albums with zero assets
- Optionally update the `asset_count` column in the background to keep it synced

Alternatively (simpler and more performant): use a single query that joins with a count subquery. Since Supabase JS doesn't support aggregation joins well, we'll:
1. Fetch all albums
2. Fetch grouped counts: `select('album_id').not('album_id', 'is', null)` from `media_assets`, then count client-side
3. Merge counts, filter out zero-count albums

### 2. `src/components/media/BulkUploadTab.tsx` — `fetchAlbums()`
Apply the same real-count logic so the bulk upload album picker also shows accurate counts and hides empty albums.

### 3. `src/components/media/MediaAssetDetailsDrawer.tsx`
The album selector here doesn't show counts, so no count fix needed. But we should still filter out empty albums so users can't assign assets to dead albums — or keep showing all albums here since the user may want to assign to an empty album. We'll keep this as-is.

### 4. Optional cleanup: delete empty albums
Add a background cleanup step in `loadAlbums()` that deletes albums with zero assets (only `source: 'auto'` albums, to preserve manually created ones the user may want to keep). This addresses "if any album does not have any videos then the album should not exist."

## Technical approach

In `loadAlbums()`:
```typescript
const { data: allAlbums } = await supabase
  .from('media_albums')
  .select('id, name, source, created_at')
  .order('created_at', { ascending: false });

const { data: countRows } = await supabase
  .from('media_assets')
  .select('album_id');
  
// Count assets per album
const countMap = new Map<string, number>();
(countRows || []).forEach(row => {
  if (row.album_id) {
    countMap.set(row.album_id, (countMap.get(row.album_id) || 0) + 1);
  }
});

// Filter to non-empty albums, attach real count
const activeAlbums = (allAlbums || [])
  .map(a => ({ ...a, asset_count: countMap.get(a.id) || 0 }))
  .filter(a => a.asset_count > 0);

setAlbums(activeAlbums);

// Background: delete empty auto-generated albums
const emptyAutoAlbums = (allAlbums || [])
  .filter(a => !countMap.has(a.id) && a.source === 'auto');
for (const album of emptyAutoAlbums) {
  await supabase.from('media_albums').delete().eq('id', album.id);
}
```

Same pattern applied to `BulkUploadTab.tsx`'s `fetchAlbums()`.

This ensures counts are always accurate and empty albums are cleaned up automatically.


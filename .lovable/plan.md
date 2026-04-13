

# Add Album Selection to Single Media Upload

## Problem
The single upload flow (`MediaUpload.tsx`) has no album selection — uploaded files are not assigned to any album. The bulk upload already supports both "New Album" and "Existing Album" modes with full UI.

## Solution
Port the album selection UI and logic from `BulkUploadTab.tsx` into the single upload form in `MediaUpload.tsx`, making album assignment optional (not required like in bulk).

## Changes

### `src/pages/media/MediaUpload.tsx`

1. **Add state variables**: `albumMode` (new/existing/none), `albumName`, `albumDescription`, `selectedAlbumId`, `existingAlbums` list
2. **Add `fetchAlbums` effect**: Same pattern as `BulkUploadTab` — query `media_albums`, compute real asset counts from `media_assets`, filter empties
3. **Add album selection UI** in the upload form (below tags/keywords fields):
   - Three-way toggle: "No Album", "New Album", "Existing Album"
   - New Album: name input + optional description
   - Existing Album: searchable select dropdown with asset counts
4. **Update upload handler**: Before calling `upload-master-to-s3`, if album mode is "new", create the album row first; if "existing", use `selectedAlbumId`. Pass `albumId` in both the presigned-URL finalize body (line ~672) and the base64 upload body (line ~728). After upload, update `asset_count` on the album.

### No edge function changes needed
The `upload-master-to-s3` function already accepts and handles `albumId` — the bulk flow already uses it.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/media/MediaUpload.tsx` | Add album selection UI, state, fetch logic, and pass `albumId` to upload calls |


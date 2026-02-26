

# Add "Select Existing Album" to Bulk Upload

## Problem
Currently the Bulk Upload tab always creates a new album. If the user already created an album (e.g. "Utah Feb 2026"), they have no way to add more files to it -- they'd have to create a duplicate.

## Solution
Add a toggle or dropdown that lets the user choose between "Create new album" and "Add to existing album". When "existing" is selected, fetch albums from `media_albums` and show a searchable select dropdown. The album name input and description fields are hidden when an existing album is selected.

## Changes

### `src/components/media/BulkUploadTab.tsx`

1. **Add state**: `albumMode: 'new' | 'existing'`, `existingAlbums: Array`, `selectedAlbumId: string | null`
2. **Fetch existing albums on mount**: query `media_albums` ordered by `created_at desc`, store in state
3. **Replace the Album Name input area** with a toggle (two radio-style buttons: "New Album" / "Existing Album"):
   - **New Album mode** (default): shows the current Album Name input + Description textarea (unchanged)
   - **Existing Album mode**: shows a `<Select>` dropdown populated with existing albums (name + asset count badge). Album Name and Description fields are hidden.
4. **Update `handleUploadAll`**:
   - If `albumMode === 'existing'`, skip the `INSERT into media_albums` step. Use `selectedAlbumId` directly as the target album.
   - Tags: use the selected album's name as the auto-tag (fetch it from the loaded list).
   - After upload completes, increment the album's `asset_count` by the number of successful uploads (use `asset_count + completed` instead of setting it to `completed`).
   - If `albumMode === 'new'`, behavior stays exactly the same as today.
5. **Validation**: require either a non-empty album name (new mode) or a selected album (existing mode) before allowing upload.

### UI Layout

```text
Album *
┌─────────────┬──────────────────┐
│ ● New Album │ ○ Existing Album │
└─────────────┴──────────────────┘

[New mode]                    [Existing mode]
Album Name *                  Select Album
┌──────────────────┐          ┌──────────────────────────┐
│ Utah Feb 2026    │          │ Utah Feb 2026 (3 assets) │
└──────────────────┘          │ Sonoma March 2025        │
Description (optional)        │ ...                      │
┌──────────────────┐          └──────────────────────────┘
│                  │
└──────────────────┘
```

## Files Modified

| File | Change |
|------|--------|
| `src/components/media/BulkUploadTab.tsx` | Add album mode toggle, fetch existing albums, conditional create-or-reuse logic |


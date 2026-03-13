

# Add Album Selector to Asset Edit Drawer

## What
Add an album assignment dropdown to the media asset details drawer so users can assign or change an asset's album while editing.

## Changes

### 1. `src/hooks/useEditableAssetFields.ts`
- Add `localAlbumId` state (initialized from asset's current `album_id`)
- Add `setLocalAlbumId` setter exposed in the return value
- Add `initialAlbumId` to the options interface
- Include `album_id` in the `handleSave` Supabase update call

### 2. `src/components/media/MediaAssetDetailsDrawer.tsx`
- Pass `initialAlbumId: asset.albumId` to `useEditableAssetFields`
- Add an album selector section (using `Select` component) inside the `EditableDescriptionTags` area or just below it, visible when `isEditing` is true
- Fetch albums list from `media_albums` table on mount
- Show current album name as read-only when not editing, dropdown when editing

### 3. `src/services/unifiedMediaService.ts`
- Verify `MediaAsset` type includes `albumId` field (map from `album_id` in DB queries)

## Files to Edit
| File | Change |
|------|--------|
| `src/hooks/useEditableAssetFields.ts` | Add `localAlbumId` state + save logic |
| `src/components/media/MediaAssetDetailsDrawer.tsx` | Add album selector UI |
| `src/services/unifiedMediaService.ts` | Ensure `albumId` is on `MediaAsset` type |


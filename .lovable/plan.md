

# Fix Asset Editing: Add Title Rename, Tag Suggestions, and Consistent Edit UI

## Problems Identified

1. **No title/rename support**: `useEditableAssetFields` and `EditableDescriptionTags` only handle description and tags — there's no way to rename an asset.

2. **No tag autocomplete**: When editing tags, users must type the exact tag name manually. There's no dropdown showing existing tags from the `media_tags` table to pick from.

3. **Details drawer is read-only**: `MediaAssetDetailsDrawer` displays tags and description but doesn't use the editable components, so editing from the drawer isn't possible.

## Plan

### 1. Add title editing to `useEditableAssetFields`
**File**: `src/hooks/useEditableAssetFields.ts`

- Add `localTitle` state, synced from a new `initialTitle` option
- Include title in `handleSave` — update `media_assets.title`
- Include title in `cancelEditing` reset
- Return `localTitle` and `setLocalTitle`

### 2. Add title field + tag autocomplete to `EditableDescriptionTags`
**File**: `src/components/media/EditableDescriptionTags.tsx`

- Accept new props: `localTitle`, `setLocalTitle`, `availableTags` (all existing `MediaTag[]` from DB)
- Render an editable title input when in edit mode (read-only text otherwise)
- Replace the free-text tag input with a filterable dropdown/popover that shows existing tags from `availableTags`, filtered by what the user types. Still allow creating new tags if no match. Show tags not already applied to the asset.

### 3. Wire up in `ImagePreviewModal` and `VideoPreviewModal`
**Files**: `src/components/media/ImagePreviewModal.tsx`, `src/components/media/VideoPreviewModal.tsx`

- Pass `initialTitle` to `useEditableAssetFields`
- Fetch all available tags from `media_tags` table on mount
- Pass `localTitle`, `setLocalTitle`, and `availableTags` to `EditableDescriptionTags`
- Make the dialog title editable (show input when editing, text when not)

### 4. Add editing to `MediaAssetDetailsDrawer`
**File**: `src/components/media/MediaAssetDetailsDrawer.tsx`

- Import and use `useEditableAssetFields` hook
- Replace the read-only description and tags sections with `EditableDescriptionTags`
- Fetch available tags and pass them through

### Tag Autocomplete UI Detail
The tag input will use a Popover + Command (cmdk) pattern (already installed) to show a searchable list of existing tags filtered as the user types. Each item shows the tag name with its color dot. Selecting a tag adds it; typing a new name and pressing Enter creates it.


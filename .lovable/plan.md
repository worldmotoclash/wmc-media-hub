

# Editable Description and Tags in Preview Modals

## Summary
Make the description and tags in both ImagePreviewModal and VideoPreviewModal editable inline, and refresh the displayed data after a re-analyze so changes are immediately visible.

## Current Behavior
- Description and tags are displayed as read-only text/badges
- After clicking "Re-analyze," the parent list refreshes (`onAssetUpdated`), but the modal still shows the stale prop data
- Users cannot manually edit description or tags from the preview

## Planned Behavior
- Description becomes an editable textarea (toggle via an Edit/Save button)
- Tags are shown with an "x" button to remove, plus an input to add new tags
- A "Save" button persists manual edits to the database
- After re-analyze completes, the modal re-fetches the asset data from the database and updates its local state, so the new description and tags appear immediately

---

## Technical Changes

### 1. `src/components/media/ImagePreviewModal.tsx`

**Local state for editable fields:**
- `localDescription` (string) -- initialized from `asset.description`
- `localTags` (MediaTag[]) -- initialized from `asset.tags`
- `isEditing` (boolean) -- toggles between view and edit mode
- `newTagInput` (string) -- for typing a new tag name

**Edit mode UI:**
- Description: swap `<p>` for a `<Textarea>` when editing
- Tags: each tag gets an "x" button to remove; an `<Input>` + "Add" button to add a new tag (calls `findOrCreate` logic in the DB via direct Supabase insert)
- "Edit" button toggles to edit mode; "Save" button persists changes and exits edit mode
- "Cancel" discards local changes

**Save handler (`handleSave`):**
- Updates `media_assets.description` via Supabase
- Handles tag additions (insert into `media_tags` if new, then `media_asset_tags`)
- Handles tag removals (delete from `media_asset_tags`)
- Calls `onAssetUpdated?.()` after save

**Re-analyze refresh:**
- After `handleReanalyze` succeeds, re-fetch the asset from `media_assets` joined with tags, and update local state (`localDescription`, `localTags`) so the new AI results appear immediately without closing/reopening the modal

### 2. `src/components/media/VideoPreviewModal.tsx`

Same pattern as ImagePreviewModal but adapted for the `VideoContent` type:

**Local state:**
- `localDescription` (string)
- `localTags` (string[]) -- VideoContent uses string tags, not MediaTag objects
- `isEditing` (boolean)
- `newTagInput` (string)

**Edit mode UI:**
- Description: editable textarea
- Tags: removable badges + add input

**Save handler:**
- For local assets (UUID IDs): update `media_assets.description` and manage `media_asset_tags` via Supabase
- For Salesforce-only assets: save is disabled (read-only note shown)

**Re-analyze refresh:**
- After re-analyze, re-fetch asset data and update local state

### 3. No backend changes required
The existing `media_assets` table already has `description` (text) and the `media_tags` / `media_asset_tags` junction tables support add/remove operations. All edits use standard Supabase client calls.


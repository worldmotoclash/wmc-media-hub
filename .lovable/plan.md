

# Fix: Always-Visible Save, Clarify Footer Actions

## Problems

1. **Edit button too hidden**: The small "Edit" pencil button next to the Title heading is easy to miss. Users expect title/description fields to be directly editable or to see a clear "Edit" action button.

2. **No edit for non-UUID assets**: `canEdit` returns false for Salesforce-only IDs, hiding the Edit button entirely with no explanation.

3. **"Open File" vs "Preview" confusion**: Both buttons are ambiguous — especially for audio assets where there's no dedicated preview modal.

## Plan

### 1. Make editing more discoverable in the drawer
**File**: `src/components/media/MediaAssetDetailsDrawer.tsx`

- Add a prominent "Edit Details" button in the drawer footer (next to Open File / Preview) that calls `editableFields.startEditing()`
- When in edit mode, the footer shows "Save" (primary) and "Cancel" instead of the normal buttons
- This makes the save/cancel always visible at the bottom of the drawer, not buried inline

### 2. Clarify footer button labels
**File**: `src/components/media/MediaAssetDetailsDrawer.tsx`

- Rename "Open File" → "Open in Browser" (clearer that it opens the raw URL)
- Rename "Preview" → context-dependent: "Play" for audio/video, "View Full Size" for images
- For audio assets, "Preview" should open the AudioPreviewModal if available, or play inline

### 3. Show disabled state with tooltip for non-editable assets
**File**: `src/components/media/EditableDescriptionTags.tsx`

- When `canEdit` is false, still show an "Edit" button but disabled with a title tooltip: "Only locally-stored assets can be edited"

### 4. Keep inline Edit button but make it more visible
**File**: `src/components/media/EditableDescriptionTags.tsx`

- Move the Edit button from next to "Title" to a more prominent position spanning the full section — e.g., a bordered "Edit Details" button above the title/description/tags block


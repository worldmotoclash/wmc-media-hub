## Problem

In the video preview modal, there is no way to edit the title (or description/tags). The form fields exist, but the component that hosts them (`EditableDescriptionTags`) is missing the Edit / Save / Cancel buttons that toggle edit mode. Because edit mode is never enabled, the Title input is never displayed and the title cannot be changed.

There is a second, related issue: for Salesforce-only videos (id starts with `sf_`), `canEdit` is false because there is no local DB row yet. The `useEditableAssetFields` hook already exposes `createLocalRecord` for this case, but the video modal does not use it.

## Fix

### 1. Render Edit / Save / Cancel inside `EditableDescriptionTags`

`src/components/media/EditableDescriptionTags.tsx`

- Add a header row with a Pencil "Edit" button when not editing, and Save / Cancel buttons (with the existing `isSaving` spinner) when editing.
- The button only appears when `canEdit` is true. When `canEdit` is false, show a small muted hint ("Create a local record to edit") and, if a new optional `onCreateLocal` prop is provided, render a "Create local record" button that calls it (used by Salesforce-only assets).
- Wire the buttons to the existing `onStartEditing`, `onCancelEditing`, `onSave` props that are already passed in from the modals.
- Use the existing `Pencil`, `Save`, `X`, `Loader2` icons (already imported).

### 2. Wire Salesforce-only video support in the video modal

`src/components/media/VideoPreviewModal.tsx`

- Pass `isCreatingLocal` and `createLocalRecord` from the hook through to `EditableDescriptionTags` as `isCreatingLocal` and `onCreateLocal`.
- When the video has an `sf_`-prefixed id, call `createLocalRecord` with a minimal `MediaAsset`-shaped object built from the current `video` (id, title, description, fileUrl=`videoSrc`, thumbnailUrl=`thumbnail`, salesforceId, assetType `video`).

### 3. Apply the same wiring to the other modals that reuse the component

`src/components/media/ImagePreviewModal.tsx` and `src/components/media/AudioPreviewModal.tsx`

- Pass through `isCreatingLocal` / `onCreateLocal` so the new button works consistently for images and audio too.
- No behavior change for assets that are already local (UUID id) — the standard Edit / Save / Cancel buttons appear.

## Out of scope

- Salesforce title sync: already handled by `handleSave` in `useEditableAssetFields` (it calls `sync-asset-to-salesforce` after the local update).
- No DB or edge function changes are needed.

## Files touched

- `src/components/media/EditableDescriptionTags.tsx` — add Edit/Save/Cancel + optional Create-local button, accept `isCreatingLocal` and `onCreateLocal` props.
- `src/components/media/VideoPreviewModal.tsx` — pass new props from the hook.
- `src/components/media/ImagePreviewModal.tsx` — same.
- `src/components/media/AudioPreviewModal.tsx` — same.
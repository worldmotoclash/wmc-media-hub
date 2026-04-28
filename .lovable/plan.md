## Problem

On media library cards (and the list-view rows), the **ExternalLink** icon button next to **View Details** / **Review** currently behaves like a second "preview" button:

- For **videos**, it calls `setSelectedAsset(asset)` which opens the in-app `VideoPreviewModal` — effectively the same UX as View Details.
- For non-videos, it correctly opens `asset.fileUrl` (the `media.worldmotoclash.com/...` CDN URL) in a new browser tab.

The user expects the ExternalLink button to always open the raw CDN URL in a new tab so they can view/download the file directly from `media.worldmotoclash.com/<key>`.

## Fix

In `src/components/media/UnifiedMediaLibrary.tsx`, remove the video-specific branch from the ExternalLink button's `onClick`. It should unconditionally call:

```ts
window.open(asset.fileUrl, '_blank', 'noopener,noreferrer');
```

This change is needed in **two places**:

1. **Grid view card** (around lines 1689–1703) — the ExternalLink button next to View Details / Review.
2. **List/table view row** (around lines 1979–1993) — the same button in the actions column.

Behaviour after the fix:

| Button         | Action                                                              |
| -------------- | ------------------------------------------------------------------- |
| View Details   | Opens the `MediaAssetDetailsDrawer` (unchanged)                     |
| Review         | Opens the librarian workflow dialog (unchanged)                     |
| ExternalLink   | Opens `asset.fileUrl` (e.g. `https://media.worldmotoclash.com/...`) in a new browser tab — for **all** asset types including video |

`asset.fileUrl` is already the CDN URL produced by the upload pipeline (`getCdnUrl(s3Key)` → `https://media.worldmotoclash.com/<key>`), so no URL construction is needed.

A small UX nicety: add `title="Open file in new tab"` to the button for clarity.

## Files

- `src/components/media/UnifiedMediaLibrary.tsx` — two `onClick` handlers simplified to always `window.open(asset.fileUrl, '_blank', 'noopener,noreferrer')`.

No other files, no DB, no edge function changes.

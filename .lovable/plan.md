

# Fix: "Open in Browser" Downloads `.mov` Videos Instead of Playing

## Problem
The two Carry videos are `.mov` (QuickTime) files. Chrome/Firefox/Edge do not support inline `.mov` playback — they download the file instead. Only Safari plays `.mov` natively.

## Solution
Change the "Open in Browser" button behavior for video assets: instead of `window.open(fileUrl)`, open the app's existing `VideoPreviewModal`. This gives a consistent in-app playback experience regardless of format (the HTML5 `<video>` element can handle many `.mov` files when the codec is H.264).

For non-video assets (images, audio), keep the current `window.open()` behavior.

## Changes

### `src/components/media/UnifiedMediaLibrary.tsx`
- For the external-link button on asset cards (grid and list views), check if the asset is a video
- If video: open `VideoPreviewModal` with the asset's `fileUrl` instead of `window.open()`
- If not video: keep `window.open()` behavior
- Add state for `browserVideoAsset` to track which video to show

### `src/components/media/MediaAssetDetailsDrawer.tsx`
- Same change for the "Open in Browser" button in the details drawer
- For video assets, open `VideoPreviewModal` instead of `window.open()`

## Technical Detail
- `VideoPreviewModal` already exists in the codebase and handles video playback via the HTML5 `<video>` tag
- The `<video>` element supports `.mov` files when the underlying codec is H.264 (common for phone/camera recordings), so most of these will play fine
- If a `.mov` uses an unsupported codec (e.g., ProRes), the video element will show an error — a fallback "Download" link should be provided in that case

## Files Changed

| File | Change |
|------|--------|
| `src/components/media/UnifiedMediaLibrary.tsx` | Route video "open" clicks to VideoPreviewModal |
| `src/components/media/MediaAssetDetailsDrawer.tsx` | Route video "Open in Browser" to VideoPreviewModal |


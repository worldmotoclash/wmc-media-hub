

# Auto-Generate Thumbnails for Large Images

## Problem
Large image assets (100MB+) display the full-resolution file in search/grid results, causing massive bandwidth usage and slow rendering. The `thumbnail_url` for images is currently set to the same URL as `file_url`.

## Solution
Two-part fix: generate a small thumbnail during upload, and use it in the grid view.

### 1. Edge function: generate image thumbnails on upload (`upload-master-to-s3`)
- For **image** uploads (not just videos), generate a resized thumbnail (max 400px, JPEG quality 0.7)
- In the **finalize path**: after the HEAD check, download the original from S3, resize server-side using a canvas/sharp approach, upload as `thumbnail.jpg` alongside the master
- In the **direct upload path**: resize the provided `imageBase64` before uploading
- Store the thumbnail CDN URL in `thumbnail_url` instead of the full-size `file_url`

Since Deno edge functions lack sharp/canvas, the approach will be:
- Accept a `thumbnailBase64` from the client for images (same as videos already do)
- Upload it to `S3_PATHS.SOCIAL_MEDIA_MASTERS/{masterId}/thumbnail.jpg`
- Set `thumbnail_url` to the thumbnail CDN URL

### 2. Client-side: generate thumbnail before upload
- In `BulkUploadTab.tsx` and `MediaUpload.tsx` (and `MasterImageUploadDialog.tsx`): for image files, use a canvas to resize to max 400px and produce a JPEG base64 string
- Pass this as `thumbnailBase64` in the upload request (reusing the existing field)

### 3. Grid view: prefer `thumbnailUrl` for images
- In `UnifiedMediaLibrary.tsx` line 1444-1445, change image rendering to prefer `thumbnailUrl` over `fileUrl`:
  ```
  // Before: asset.fileUrl || asset.thumbnailUrl
  // After:  asset.thumbnailUrl || asset.fileUrl
  ```
- This ensures the small thumbnail loads in the grid; clicking "View Details" or opening still uses `fileUrl`

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/upload-master-to-s3/index.ts` | Handle `thumbnailBase64` for images (not just videos), upload as thumbnail.jpg |
| `src/pages/media/MediaUpload.tsx` | Generate thumbnail base64 for images before upload |
| `src/components/media/BulkUploadTab.tsx` | Generate thumbnail base64 for images before upload |
| `src/components/media/MasterImageUploadDialog.tsx` | Generate thumbnail base64 for images before upload |
| `src/components/media/UnifiedMediaLibrary.tsx` | Prefer `thumbnailUrl` over `fileUrl` for image grid cards |

## Technical Notes
- Thumbnail generation reuses the existing resize-to-1024px pattern from the AI analysis payload optimization, but targets 400px for even smaller thumbnails
- The `thumbnailBase64` field already exists in the edge function interface — we just need to stop gating it behind `isVideo`
- Existing assets with no separate thumbnail will still work fine (they fall back to `fileUrl`)


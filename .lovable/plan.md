

# Fix: Avoid Loading Full-Size Images in Media Library Grid

## Problem
In `UnifiedMediaLibrary.tsx`, the grid thumbnail `src` for image assets uses `asset.thumbnailUrl || asset.fileUrl`. When `thumbnailUrl` is null (common for older uploads, Salesforce-sourced assets, or assets uploaded before thumbnail generation was added), the browser loads the full-resolution file (potentially 10-50MB) just to display a 200px grid card.

## Root Cause
Line 1444-1445 in `UnifiedMediaLibrary.tsx`:
```
isImageType(asset.assetType)
  ? (asset.thumbnailUrl || asset.fileUrl || '/placeholder.svg')
```
The fallback chain goes directly to `fileUrl` with no intermediate optimization.

## Solution

### 1. Backfill missing thumbnails on-the-fly (client-side)
When rendering an image asset where `thumbnailUrl` is missing but `fileUrl` exists, generate a thumbnail client-side using the existing `generateImageThumbnail` utility (already in the project at `src/utils/generateImageThumbnail.ts`). Cache the generated data-URL in component state so it's only done once per session.

- Add a `thumbnailCache` state (`Map<string, string>`) to `UnifiedMediaLibrary`
- When an image asset has no `thumbnailUrl`, fetch the image via `fileUrl`, generate a thumbnail, and store the base64 result in the cache
- Use the cached thumbnail as `src` instead of the full `fileUrl`
- Limit concurrent thumbnail generation (e.g., 3 at a time) to avoid flooding the browser

### 2. Use placeholder while thumbnail generates
While the thumbnail is being generated, show the placeholder SVG instead of loading the full image. This prevents the bandwidth spike immediately.

### 3. Persist backfilled thumbnails to DB (optional enhancement)
After generating a client-side thumbnail, update `media_assets.thumbnail_url` with the base64 data URL so future page loads don't need to regenerate. This is a low-priority optimization.

## Changes

| File | Change |
|------|--------|
| `src/components/media/UnifiedMediaLibrary.tsx` | Add thumbnail cache state, async generation effect for assets missing thumbnails, update `img src` logic to use cache with placeholder fallback |
| `src/utils/generateImageThumbnail.ts` | Add a `generateImageThumbnailFromUrl` variant that accepts a URL instead of a File object |

## Technical Detail
The `generateImageThumbnail` utility currently requires a `File` object. A new helper `generateImageThumbnailFromUrl(url: string)` will fetch the image, create a blob, and pass it through the same canvas-based downsizing pipeline. The 400px max-size and 0.7 JPEG quality settings match the existing upload-time thumbnail spec.


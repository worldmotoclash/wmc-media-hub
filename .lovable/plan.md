
# Fix: Resize Images Before AI Analysis

## Root Cause
The `fileToBase64` function sends the **full-resolution image** as base64 to the edge function. A high-res poster PNG (e.g. `WMC-Utah-Poster-1.png`) can be 5-15MB raw, becoming 7-20MB as base64. The AI gateway rejects or times out on these oversized payloads, returning 502 errors. Retries don't help because the payload is still too large.

The video analysis path already avoids this -- it captures a single JPEG frame via canvas at 0.8 quality. But the image path sends the raw file unchanged.

## Fix

### `src/pages/media/MediaUpload.tsx`

Add a `resizeImageForAnalysis` helper that:
1. Loads the image file into an `<img>` element
2. Draws it onto a canvas, scaling down to a max dimension of 1024px (preserving aspect ratio)
3. Exports as JPEG at 0.8 quality (typically produces a 50-150KB payload instead of 5-15MB)

Then in `handleAnalyzeMedia`, replace the direct `fileToBase64(selectedFile)` call with `resizeImageForAnalysis(selectedFile)` for the image path.

```text
Before:
  Image file (5MB PNG) --> fileToBase64 --> 7MB base64 --> edge function --> AI gateway (502!)

After:
  Image file (5MB PNG) --> canvas resize to 1024px JPEG --> ~100KB base64 --> edge function --> AI gateway (success)
```

### No edge function changes needed
The edge function already handles both `data:image/jpeg;base64,...` and raw base64 strings. The smaller payload will just work.

### No other files affected
The `fileToBase64` function in other files (ImageDropzone, MasterImageUploadDialog, etc.) is used for actual uploads where full resolution is needed -- those stay unchanged.

## Technical Details

New function in `MediaUpload.tsx`:

```typescript
const resizeImageForAnalysis = (file: File, maxDim = 1024): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image for resize'));
    };
    img.src = URL.createObjectURL(file);
  });
};
```

Change in `handleAnalyzeMedia`:
```typescript
// Before
mediaData = await fileToBase64(selectedFile);

// After
mediaData = await resizeImageForAnalysis(selectedFile);
```

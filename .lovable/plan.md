
# Fix: Lower Presigned Upload Threshold for All File Types

## Problem
A 28MB file (video or audio) is below the 50MB presigned threshold, so it gets sent as base64 through the `upload-master-to-s3` edge function. The base64 encoding inflates the file to ~37MB, which exceeds the edge function's memory limit and causes a `WORKER_LIMIT` error.

## Fix
Change the presigned URL threshold from 50MB (for video/audio) to **4MB for all file types**. This ensures any file over 4MB uploads directly to S3 via presigned URL, bypassing the edge function's memory constraints entirely.

## Technical Change

### `src/pages/media/MediaUpload.tsx`
- Change the `PRESIGNED_THRESHOLD` logic from a conditional (4MB for images, 50MB for video/audio) to a flat **4MB for all types**
- This is a one-line change

```
Before:
  const PRESIGNED_THRESHOLD = isImage ? 4 * 1024 * 1024 : 50 * 1024 * 1024;

After:
  const PRESIGNED_THRESHOLD = 4 * 1024 * 1024; // 4MB for all file types
```

### `src/components/media/MasterImageUploadDialog.tsx`
- Apply the same threshold change if it has a similar conditional (for consistency)

## No edge function or backend changes needed
The presigned URL flow and finalize path in `upload-master-to-s3` already work correctly for all file types. This is purely a frontend threshold adjustment.

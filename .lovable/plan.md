

# Fix: Bulk Upload Not Accepting Dragged Files from Image Capture

## Problem
When dragging files from Mac Image Capture into the dropzone, the browser receives `File` objects with **empty MIME types** (`file.type === ""`). The current code filters files using `file.type.startsWith('video/')`, which rejects all files with blank types. Nothing gets added to the queue.

## Solution
Add a **file extension fallback** when `file.type` is empty. If the MIME type is blank, check the file extension (`.jpg`, `.png`, `.mp4`, `.mov`, `.mp3`, etc.) to determine if the file is valid media.

## Technical Change

### `src/components/media/BulkUploadTab.tsx`

Update the `addFiles` function to use extension-based validation as a fallback:

```typescript
const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'tiff', 'bmp', 'svg'];
const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'wmv', 'm4v', 'flv'];
const audioExtensions = ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac', 'wma'];
const allExtensions = [...imageExtensions, ...videoExtensions, ...audioExtensions];

const isValidMedia = (f: File) => {
  // Check MIME type first
  if (f.type && ['video/', 'image/', 'audio/'].some(t => f.type.startsWith(t))) {
    return true;
  }
  // Fallback: check file extension
  const ext = f.name.split('.').pop()?.toLowerCase() || '';
  return allExtensions.includes(ext);
};

const newFiles = Array.from(files)
  .filter(isValidMedia)
  .map(f => ({ ... }));
```

Also update `getFileIcon` to use the same extension fallback so icons display correctly for files with blank MIME types.

### No other files need to change
The presigned URL edge function already infers MIME type from the extension, and the S3 upload uses `Content-Type` from the request -- so downstream everything already handles this case.


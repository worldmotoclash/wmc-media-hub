
# Fix: Scene Detection Stalling During Video Download

## Problem Analysis
The scene detection stalls at **"Downloading video... 20%"** because:

1. **No download progress tracking**: The `fetch(asset.fileUrl)` provides no progress updates - users see a frozen progress bar
2. **No timeout**: If the S3/Wasabi server is slow or CORS is misconfigured, the fetch hangs forever
3. **No cancel option**: Users can't abort a stuck download
4. **The 20% is misleading**: It's leftover from the previous "Extracting video metadata" phase, not actual download progress

## Solution Overview
Add proper download progress tracking using `fetch` with `ReadableStream`, implement a timeout, and add a cancel button.

## Technical Changes

### File 1: `src/pages/media/SceneDetection.tsx`

**1. Add cancel state and abort controller (around line 50)**
```typescript
const [abortController, setAbortController] = useState<AbortController | null>(null);

const handleCancelProcessing = () => {
  if (abortController) {
    abortController.abort();
    setAbortController(null);
  }
  setIsProcessing(false);
  setProgress(0);
  setProcessingPhase('');
  toast.info('Scene detection cancelled');
};
```

**2. Add download progress helper function**
```typescript
const downloadWithProgress = async (
  url: string, 
  onProgress: (percent: number) => void,
  signal: AbortSignal
): Promise<Blob> => {
  const response = await fetch(url, { signal });
  
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.statusText}`);
  }
  
  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  
  if (!total || !response.body) {
    // Fallback: no progress tracking possible
    return response.blob();
  }
  
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    chunks.push(value);
    received += value.length;
    onProgress(Math.round((received / total) * 100));
  }
  
  return new Blob(chunks);
};
```

**3. Update handleDetectScenes to use abort controller and progress**
Replace the asset download section:
```typescript
// Create abort controller for cancellation
const controller = new AbortController();
setAbortController(controller);

// Download the video file from the asset URL with progress
setProcessingPhase('Downloading video...');
setProgress(0);

const blob = await downloadWithProgress(
  asset.fileUrl,
  (percent) => {
    setProgress(percent * 0.2); // 0-20% for download phase
    setProcessingPhase(`Downloading video... ${percent}%`);
  },
  controller.signal
);

videoFile = new File([blob], asset.title || 'video.mp4', { type: blob.type });
```

**4. Add timeout wrapper with 2-minute limit**
```typescript
const downloadWithTimeout = async (url: string, signal: AbortSignal, timeoutMs: number = 120000) => {
  const timeoutId = setTimeout(() => signal.abort(), timeoutMs);
  try {
    return await downloadWithProgress(url, onProgress, signal);
  } finally {
    clearTimeout(timeoutId);
  }
};
```

**5. Add Cancel button to UI (around line 377-393)**
Replace the button section:
```typescript
<div className="flex gap-2">
  <Button 
    onClick={handleDetectScenes} 
    disabled={!selectedVideo || isProcessing}
    className="flex-1"
  >
    {isProcessing ? (
      <>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Processing...
      </>
    ) : (
      <>
        <Play className="w-4 h-4 mr-2" />
        Detect Scenes
      </>
    )}
  </Button>
  
  {isProcessing && (
    <Button 
      onClick={handleCancelProcessing}
      variant="destructive"
    >
      Cancel
    </Button>
  )}
</div>
```

**6. Handle abort errors gracefully**
In the catch block:
```typescript
} catch (error) {
  if ((error as Error).name === 'AbortError') {
    console.log('Scene detection was cancelled');
    return; // Don't show error toast for user-initiated cancel
  }
  console.error('Scene detection error:', error);
  toast.error((error as Error).message || 'Scene detection failed');
}
```

## Progress Phases After Fix

| Phase | Progress | Message |
|-------|----------|---------|
| FFmpeg loading | 0-100% | "Loading video processor..." |
| Video download | 0-20% | "Downloading video... 45%" |
| Write to FFmpeg | 20% | "Writing video file..." |
| Metadata extraction | 20-40% | "Extracting video metadata..." |
| Scene analysis | 40-60% | "Analyzing scene changes..." |
| Thumbnail extraction | 60-95% | "Extracting thumbnail 3/12..." |
| Complete | 100% | "Found 12 scenes" |

## Expected Result
- Users see real-time download progress (e.g., "Downloading video... 67%")
- A Cancel button appears during processing
- If download takes >2 minutes, it auto-cancels with an error message
- Users can manually cancel at any time
- CORS/network errors surface immediately instead of hanging

## Alternative Approach (If CORS Blocks Progress)
Some S3 buckets don't expose `Content-Length` headers due to CORS. In that case, we'll show an indeterminate progress message like "Downloading video (size unknown)..." with a pulsing animation instead of a percentage.

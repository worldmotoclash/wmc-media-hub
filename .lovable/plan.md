
# Fix Awkward Video Selection and Auto-Loading UX

## Problem
The Scene Detection page has confusing UX because:
1. **FFmpeg loads immediately on page mount** - shows "Loading..." in the button before user takes any action
2. **Video list auto-loads** - fetches videos immediately when the component renders
3. **Combined effect** - when user selects a video, they see loading states that make it feel like selection triggered processing

## User Experience Issue
From the screenshot:
- User sees "Loading..." button state
- "Loading FFmpeg..." message at bottom
- This happens before they click "Detect Scenes", making selection feel awkward

## Solution

### Change 1: Lazy-Load FFmpeg (Only When Needed)
Move FFmpeg initialization from component mount to when the user clicks "Detect Scenes":

**File:** `src/pages/media/SceneDetection.tsx`

```typescript
// REMOVE the useEffect that auto-initializes FFmpeg on mount (lines 53-72)
// Instead, initialize inside handleDetectScenes:

const handleDetectScenes = async () => {
  // ... existing validation ...
  
  setIsProcessing(true);
  
  // Initialize FFmpeg if not already done
  if (!ffmpegInitialized) {
    setProcessingPhase('Loading video processor...');
    await clientSideSceneDetection.initialize((progress) => {
      setProgress(progress.progress);
      setProcessingPhase(progress.message);
    });
    setFfmpegInitialized(true);
  }
  
  // ... rest of processing ...
};
```

**Button state change:**
- Remove the "Loading..." state when FFmpeg is not initialized
- Show "Detect Scenes" immediately, processing only starts on click

### Change 2: Improve Video List Loading Feedback
The video list already loads on mount (which is acceptable), but we can improve the UX:

**File:** `src/components/media/VideoSelector.tsx`

- Keep the auto-load behavior (users expect to see their videos)
- The debounce fix already helps with search
- No changes needed here

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/media/SceneDetection.tsx` | Move FFmpeg init to `handleDetectScenes`, update button states |

## Detailed Code Changes

### SceneDetection.tsx

1. **Remove auto-init useEffect** (lines 53-72):
```typescript
// DELETE this entire useEffect block
useEffect(() => {
  const initFFmpeg = async () => {
    // ...
  };
  initFFmpeg();
}, []);
```

2. **Update handleDetectScenes** (line 81+):
```typescript
const handleDetectScenes = async () => {
  if (!selectedVideo) {
    toast.error("Please select a video first");
    return;
  }

  setIsProcessing(true);
  setProgress(0);
  setProcessingPhase('');
  setResults(null);

  try {
    // Initialize FFmpeg on first use
    if (!ffmpegInitialized) {
      setProcessingPhase('Loading video processor...');
      await clientSideSceneDetection.initialize((progress) => {
        setProgress(progress.progress);
        setProcessingPhase(progress.message);
      });
      setFfmpegInitialized(true);
    }

    // ... rest of existing code ...
  }
};
```

3. **Update button disabled state** (line 394):
```typescript
// Change from:
disabled={!selectedVideo || isProcessing || !ffmpegInitialized}

// To:
disabled={!selectedVideo || isProcessing}
```

4. **Update button content** (lines 397-412):
```typescript
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
```

5. **Update progress visibility** (lines 415-422):
```typescript
{isProcessing && (
  <div className="space-y-2">
    <Progress value={progress} className="w-full" />
    <p className="text-sm text-muted-foreground text-center">
      {processingPhase || 'Processing...'} {progress > 0 && `${progress.toFixed(0)}%`}
    </p>
  </div>
)}
```

## Expected Behavior After Fix

1. User opens Scene Detection page
2. Video list loads (normal, expected)
3. User selects a video - no loading indicators
4. User clicks "Detect Scenes"
5. NOW the loading starts: "Loading video processor..." then "Analyzing..."
6. Results appear when complete

## Technical Notes

- FFmpeg WASM is ~30MB and takes 2-5 seconds to load
- Lazy loading it means first-time detection is slightly slower
- But subsequent detections are fast (FFmpeg stays initialized)
- This is better UX than showing loading before user takes action

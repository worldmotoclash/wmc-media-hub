

# Complete Scene Detection with Real FFmpeg Parsing & In-Out Clip Selection

## Overview
This plan addresses two main objectives:
1. **Make scene detection functional** by replacing mock data with real FFmpeg output parsing
2. **Add clip extraction feature** to allow users to specify in-out timestamps and export video clips

---

## Current State Summary

| Component | Status | Issue |
|-----------|--------|-------|
| FFmpeg Loading | Working | Loads successfully in browser |
| Video Metadata | Mock | Returns hardcoded duration (60s), resolution (1920x1080), FPS (25) |
| Scene Analysis | Mock | Generates random timestamps instead of parsing FFmpeg output |
| Thumbnail Extraction | Working | Real frames extracted at timestamps |
| Clip Export | Not Built | No UI or logic exists |

---

## Solution Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SceneDetection.tsx (Updated UI)                        │
│  + Dual-handle range slider for in-out selection                            │
│  + "Export Clip" button                                                     │
│  + Click-to-set timestamps from scene list                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│               clientSideSceneDetection.ts (Core Changes)                    │
│  1. Add log listener to capture FFmpeg stderr                               │
│  2. Parse metadata: Duration, Resolution, FPS from log output               │
│  3. Parse scene changes from log or showinfo filter output                  │
│  4. New extractClip() method using -ss and -to flags                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Part 1: Real Scene Detection

### File: `src/services/clientSideSceneDetection.ts`

#### 1.1 Add Log Capture Infrastructure
Add a private log buffer and listener setup during initialization:

```typescript
// After line 30
private logBuffer: string = '';

// Inside initialize() after line 37
this.ffmpeg.on('log', ({ message }) => {
  this.logBuffer += message + '\n';
});
```

#### 1.2 Implement Real Metadata Parsing
Replace the mock `getVideoMetadata()` function (lines 96-113):

```typescript
private async getVideoMetadata(): Promise<{ duration: number; resolution: string; fps: number }> {
  if (!this.ffmpeg) throw new Error('FFmpeg not initialized');
  
  // Clear log buffer
  this.logBuffer = '';
  
  // Run FFmpeg to get metadata (stderr contains info)
  await this.ffmpeg.exec(['-i', 'input.mp4']);
  
  // Parse duration: "Duration: 00:01:23.45"
  const durationMatch = this.logBuffer.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
  let duration = 60; // Default fallback
  if (durationMatch) {
    const hours = parseInt(durationMatch[1]);
    const mins = parseInt(durationMatch[2]);
    const secs = parseInt(durationMatch[3]);
    const centisecs = parseInt(durationMatch[4]);
    duration = hours * 3600 + mins * 60 + secs + centisecs / 100;
  }
  
  // Parse resolution: "Stream #0:0: Video: ... 1920x1080"
  const resMatch = this.logBuffer.match(/(\d{2,4})x(\d{2,4})/);
  const resolution = resMatch ? `${resMatch[1]}x${resMatch[2]}` : '1920x1080';
  
  // Parse FPS: "25 fps" or "29.97 tbr"
  const fpsMatch = this.logBuffer.match(/(\d+(?:\.\d+)?)\s*(?:fps|tbr)/);
  const fps = fpsMatch ? parseFloat(fpsMatch[1]) : 25;
  
  console.log('Parsed metadata:', { duration, resolution, fps });
  return { duration, resolution, fps };
}
```

#### 1.3 Implement Real Scene Detection
Replace the mock `analyzeScenes()` function (lines 116-151):

```typescript
private async analyzeScenes(threshold: number, duration: number, fps: number): Promise<SceneDetection[]> {
  if (!this.ffmpeg) throw new Error('FFmpeg not initialized');
  
  // Clear log buffer
  this.logBuffer = '';
  
  // Use scene detection with showinfo to log frame data
  const thresholdValue = threshold / 100;
  await this.ffmpeg.exec([
    '-i', 'input.mp4',
    '-vf', `select='gt(scene,${thresholdValue})',showinfo`,
    '-f', 'null', '-'
  ]);
  
  // Parse showinfo output for scene frames
  // Format: [Parsed_showinfo_1 @ ...] n: 123 pts: 12345 pts_time:12.345 ...
  const scenes: SceneDetection[] = [];
  const lines = this.logBuffer.split('\n');
  
  for (const line of lines) {
    const showInfoMatch = line.match(/pts_time:\s*([\d.]+)/);
    const frameMatch = line.match(/n:\s*(\d+)/);
    
    if (showInfoMatch) {
      const timestamp = parseFloat(showInfoMatch[1]);
      const frame = frameMatch ? parseInt(frameMatch[1]) : Math.floor(timestamp * fps);
      
      // Confidence based on scene score if available, else use threshold-based estimate
      const scoreMatch = line.match(/scene:\s*([\d.]+)/);
      const confidence = scoreMatch 
        ? Math.min(100, parseFloat(scoreMatch[1]) * 100)
        : Math.max(50, threshold + 20);
      
      scenes.push({ timestamp, frame, confidence });
    }
  }
  
  // Always include frame 0 as first scene
  if (scenes.length === 0 || scenes[0].timestamp > 0.5) {
    scenes.unshift({ timestamp: 0, frame: 0, confidence: 100 });
  }
  
  console.log(`Detected ${scenes.length} real scenes from FFmpeg`);
  return scenes;
}
```

---

## Part 2: In-Out Clip Extraction

### 2.1 Add Clip Export Interface
Add to `clientSideSceneDetection.ts`:

```typescript
export interface ClipExportOptions {
  startTime: number;
  endTime: number;
  outputFormat?: 'mp4' | 'webm';
  quality?: 'high' | 'medium' | 'low';
}

export interface ClipResult {
  blob: Blob;
  filename: string;
  duration: number;
  size: number;
}
```

### 2.2 Add extractClip Method
Add new method to `ClientSideSceneDetectionService`:

```typescript
async extractClip(
  options: ClipExportOptions,
  onProgress?: (progress: ProcessingProgress) => void
): Promise<ClipResult> {
  if (!this.ffmpeg) throw new Error('FFmpeg not initialized');
  
  const { startTime, endTime, outputFormat = 'mp4' } = options;
  const duration = endTime - startTime;
  
  if (duration <= 0) throw new Error('End time must be after start time');
  if (duration > 300) throw new Error('Clip cannot exceed 5 minutes');
  
  onProgress?.({ phase: 'extracting', progress: 0, message: 'Preparing clip...' });
  
  const outputFile = `clip_output.${outputFormat}`;
  
  // Use -ss before -i for fast seeking, then -t for duration
  await this.ffmpeg.exec([
    '-ss', startTime.toString(),
    '-i', 'input.mp4',
    '-t', duration.toString(),
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-preset', 'fast',
    outputFile
  ]);
  
  onProgress?.({ phase: 'extracting', progress: 80, message: 'Reading clip...' });
  
  // Read the output file
  const data = await this.ffmpeg.readFile(outputFile);
  const uint8Array = data as Uint8Array;
  const blob = new Blob([uint8Array], { type: `video/${outputFormat}` });
  
  // Clean up
  await this.ffmpeg.deleteFile(outputFile);
  
  onProgress?.({ phase: 'complete', progress: 100, message: 'Clip ready!' });
  
  return {
    blob,
    filename: `clip_${startTime.toFixed(1)}-${endTime.toFixed(1)}.${outputFormat}`,
    duration,
    size: blob.size
  };
}
```

---

## Part 3: UI Enhancements

### File: `src/pages/media/SceneDetection.tsx`

#### 3.1 Add State for Clip Selection
Add new state variables (after line 46):

```typescript
const [clipRange, setClipRange] = useState<[number, number]>([0, 0]);
const [isExportingClip, setIsExportingClip] = useState(false);
```

#### 3.2 Add Clip Range Slider
Add a new Card after the Results card for clip extraction:

```typescript
{results && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Scissors className="w-5 h-5" />
        Extract Clip
      </CardTitle>
      <CardDescription>
        Select a time range to extract a clip from the video
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label>Time Range: {formatTime(clipRange[0])} - {formatTime(clipRange[1])}</Label>
        <Slider
          min={0}
          max={results.videoDuration}
          step={0.1}
          value={clipRange}
          onValueChange={(values) => setClipRange([values[0], values[1]])}
          className="mt-2"
        />
      </div>
      
      <div className="flex gap-4">
        <div className="flex-1">
          <Label>Start Time (seconds)</Label>
          <Input
            type="number"
            step="0.1"
            value={clipRange[0].toFixed(1)}
            onChange={(e) => setClipRange([parseFloat(e.target.value) || 0, clipRange[1]])}
          />
        </div>
        <div className="flex-1">
          <Label>End Time (seconds)</Label>
          <Input
            type="number"
            step="0.1"
            value={clipRange[1].toFixed(1)}
            onChange={(e) => setClipRange([clipRange[0], parseFloat(e.target.value) || 0])}
          />
        </div>
      </div>
      
      <Button 
        onClick={handleExportClip}
        disabled={isExportingClip || clipRange[1] <= clipRange[0]}
        className="w-full"
      >
        {isExportingClip ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Exporting...
          </>
        ) : (
          <>
            <Scissors className="w-4 h-4 mr-2" />
            Export Clip ({formatTime(clipRange[1] - clipRange[0])})
          </>
        )}
      </Button>
    </CardContent>
  </Card>
)}
```

#### 3.3 Add Click-to-Select from Scene List
Modify scene row (around line 462) to allow clicking to set in/out points:

```typescript
<div 
  key={index} 
  className="grid grid-cols-6 gap-4 p-3 border rounded-lg hover:bg-muted/50 items-center cursor-pointer"
  onClick={() => {
    // If no start set, or clicking earlier than current start, set as start
    if (clipRange[0] === 0 && clipRange[1] === 0) {
      setClipRange([scene.timestamp, results.videoDuration]);
    } else if (scene.timestamp < clipRange[0]) {
      setClipRange([scene.timestamp, clipRange[1]]);
    } else {
      setClipRange([clipRange[0], scene.timestamp]);
    }
  }}
>
  {/* ... existing content ... */}
  <div className="flex gap-1">
    <Button 
      variant="ghost" 
      size="sm"
      onClick={(e) => { e.stopPropagation(); setClipRange([scene.timestamp, clipRange[1] || results.videoDuration]); }}
    >
      Set In
    </Button>
    <Button 
      variant="ghost" 
      size="sm"
      onClick={(e) => { e.stopPropagation(); setClipRange([clipRange[0], scene.timestamp]); }}
    >
      Set Out
    </Button>
  </div>
</div>
```

#### 3.4 Add Export Handler
Add handler function:

```typescript
const handleExportClip = async () => {
  if (!selectedVideo || clipRange[1] <= clipRange[0]) return;
  
  setIsExportingClip(true);
  try {
    const clip = await clientSideSceneDetection.extractClip({
      startTime: clipRange[0],
      endTime: clipRange[1],
    }, (progress) => {
      setProcessingPhase(progress.message);
    });
    
    // Trigger download
    const url = URL.createObjectURL(clip.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = clip.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success(`Clip exported: ${clip.filename} (${(clip.size / 1024 / 1024).toFixed(1)} MB)`);
  } catch (error) {
    toast.error(error.message || 'Failed to export clip');
  } finally {
    setIsExportingClip(false);
    setProcessingPhase('');
  }
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/services/clientSideSceneDetection.ts` | Add log capture, real metadata parsing, real scene detection, clip extraction |
| `src/pages/media/SceneDetection.tsx` | Add clip range state, dual-slider UI, scene click handlers, export button |

---

## Technical Considerations

### FFmpeg WASM Limitations
- **File Size**: Browser memory limits (~100MB practical limit for videos)
- **Codec Support**: libx264/aac require specific WASM builds - may need fallback to copy codec
- **Performance**: Client-side processing is slower than server-side

### Fallback Strategy
If `libx264` encoding fails, fall back to stream copy:
```typescript
// Fallback: copy streams without re-encoding (faster, no quality loss)
await this.ffmpeg.exec([
  '-ss', startTime.toString(),
  '-i', 'input.mp4',
  '-t', duration.toString(),
  '-c', 'copy',  // Copy instead of re-encode
  outputFile
]);
```

---

## Testing Checklist

After implementation:
- [ ] Upload a video and verify real duration/resolution/FPS are displayed
- [ ] Run scene detection and confirm timestamps match actual scene changes
- [ ] Set in-out points using the slider and verify the range
- [ ] Click "Set In" and "Set Out" from scene list and verify times update
- [ ] Export a clip and verify it plays correctly with expected duration
- [ ] Test with videos of various lengths and formats



# Expand Media Upload to Support Images, Audio & AI Classification

## Overview
The current "Upload Video" page is restrictive - it only accepts video files. Users need to:
1. Upload images and audio files (not just video)
2. Classify audio as podcasts (and other categories)
3. Use AI analysis and tagging during the upload process for all media types

## Current Limitations

| Feature | Current State | Desired State |
|---------|--------------|---------------|
| File Types | Video only (MP4, WebM, MOV, AVI, M4V) | Video + Image + Audio |
| AI Analysis | Video frames only | Video frames, images directly, audio metadata |
| Podcast Classification | Not available | Audio content can be tagged as "Podcast" |
| Page Title | "Upload Video" | "Upload Media" |

---

## Part 1: Expand File Type Support in MediaUpload.tsx

### 1.1 Update File Validation
Modify the `handleFileSelect` function to accept video, image, and audio:

```typescript
const handleFileSelect = (file: File) => {
  const validTypes = [
    // Video
    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-m4v',
    // Image
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    // Audio
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-m4a', 'audio/aac', 
    'audio/flac', 'audio/ogg', 'audio/mp4'
  ];
  // ... validation logic
};
```

### 1.2 Update File Input Accept Attribute
Change the hidden file input to accept all media types:

```html
<input
  type="file"
  accept="video/*,image/*,audio/*"
  ...
/>
```

### 1.3 Dynamic UI Based on File Type
Show different icons and messaging based on selected file type:
- **Video**: FileVideo icon, show duration extraction
- **Image**: ImageIcon, show dimensions 
- **Audio**: Music icon, show duration extraction

---

## Part 2: Add Podcast Classification Option

### 2.1 Add "Is Podcast" Toggle for Audio
When an audio file is selected, show a checkbox/toggle:

```tsx
{isAudioFile && (
  <div className="flex items-center gap-2">
    <Switch 
      checked={isPodcast} 
      onCheckedChange={setIsPodcast} 
    />
    <Label>This is a podcast episode</Label>
  </div>
)}
```

### 2.2 Update Categories Constants
The `APPROVED_CATEGORIES` in auto-tag already includes "Podcast"-suitable categories. We'll add a specific "Podcast" tag that gets applied when the toggle is on.

### 2.3 Pass Podcast Flag to Backend
Include `isPodcast: true` in the upload payload so tags include "Podcast".

---

## Part 3: Adapt AI Analysis for All Media Types

### 3.1 Update `handleAnalyzeVideo` to Handle Multiple Types
Rename to `handleAnalyzeMedia` and branch based on file type:

```typescript
const handleAnalyzeMedia = async () => {
  if (!selectedFile) return;
  
  const fileType = getFileType(selectedFile); // 'video' | 'image' | 'audio'
  
  if (fileType === 'video') {
    // Existing: extract frame and analyze
    const frameData = await extractVideoFrame(selectedFile);
    // Call analyze-video-preview
  } else if (fileType === 'image') {
    // Convert image directly to base64
    const imageData = await fileToBase64(selectedFile);
    // Call analyze-video-preview (works for images too)
  } else if (fileType === 'audio') {
    // Audio: analyze by filename + metadata only
    // Call analyze-audio-metadata (new or adapted endpoint)
  }
};
```

### 3.2 Create Audio Analysis Prompt
For audio files (where visual AI can't help), use filename-based classification:

```typescript
// In analyze-video-preview or new audio-specific function
if (mediaType === 'audio') {
  const prompt = `Classify this audio file for a motorsports media library.
  Filename: "${fileName}"
  
  Determine:
  - Is this likely a podcast episode, interview, sound effect, music track, or commentary?
  - Suggest appropriate categories from: ${APPROVED_CATEGORIES.join(', ')}
  - Suggest a descriptive title based on the filename`;
}
```

---

## Part 4: Update Backend (upload-master-to-s3)

### 4.1 Detect Audio Files
Add audio detection alongside video and image:

```typescript
const isVideo = mimeType?.startsWith('video/');
const isAudio = mimeType?.startsWith('audio/');
const isImage = !isVideo && !isAudio;

const assetType = isVideo ? 'video' : isAudio ? 'audio' : 'master_image';
```

### 4.2 Handle Audio-Specific Metadata
- Extract duration from audio files (similar to video)
- Skip thumbnail generation for audio
- Set appropriate S3 path for audio files

### 4.3 Update Auto-Tag Trigger
Allow `mediaType: 'audio'` in the auto-tag call:

```typescript
EdgeRuntime.waitUntil(
  fetch(autoTagUrl, {
    body: JSON.stringify({
      assetId: assetData.id,
      mediaUrl: cdnUrl,
      mediaType: isVideo ? 'video' : isAudio ? 'audio' : 'image',
    }),
  })
);
```

---

## Part 5: Update auto-tag-media-asset for Audio

### 5.1 Add Audio-Specific Categories
Add to APPROVED_CATEGORIES:

```typescript
const APPROVED_CATEGORIES = [
  // Existing...
  'Podcast', 'Interview Audio', 'Race Commentary', 'Sound Effects', 'Music Track'
];
```

### 5.2 Filename-Based Analysis for Audio
Since AI can't "see" audio, use filename and metadata:

```typescript
if (mediaType === 'audio') {
  // Use text-only analysis based on filename
  const userPrompt = `Classify this audio file based on its filename: "${filename}"
  
  Context: This is for a motorsports media library (World Moto Clash).
  
  Determine the most likely category and description.`;
  
  // Don't send image_url, just text
  messages = [
    { role: 'system', content: KNEWTV_SYSTEM_PROMPT },
    { role: 'user', content: userPrompt }
  ];
}
```

---

## Part 6: UI Updates

### 6.1 Rename Page and Update Messaging
- Change title from "Upload Video" to "Upload Media"
- Update drag/drop zone text: "Drag & drop video, image, or audio files"
- Update file size limit text based on type

### 6.2 Show Relevant Metadata Fields
- For Video: Duration, Dimensions, Thumbnail preview
- For Image: Dimensions, Full preview
- For Audio: Duration, Waveform (future), Podcast toggle

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/media/MediaUpload.tsx` | Accept all media types, rename to "Upload Media", add podcast toggle, adapt AI analysis |
| `supabase/functions/upload-master-to-s3/index.ts` | Detect audio files, set correct asset_type, handle audio metadata |
| `supabase/functions/auto-tag-media-asset/index.ts` | Add audio-specific analysis path, add Podcast category |
| `supabase/functions/analyze-video-preview/index.ts` | Add audio filename-based analysis fallback |
| `src/constants/salesforceFields.ts` | Already has 'AUDIO' content type - no changes needed |

---

## Audio Duration Extraction (Client-Side)

For audio files, extract duration using the Audio API:

```typescript
const extractAudioDuration = (file: File): Promise<number> => {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      resolve(audio.duration);
    };
    audio.onerror = () => resolve(0);
    audio.src = URL.createObjectURL(file);
  });
};
```

---

## Expected Result After Implementation

1. **Unified Upload Page**: Users can upload video, image, or audio from a single page
2. **Podcast Classification**: Audio files can be flagged as podcasts during upload
3. **AI Analysis for All Types**: 
   - Video → frame extraction → visual AI
   - Image → direct visual AI
   - Audio → filename + metadata → text AI classification
4. **Proper Asset Types**: Database stores correct `asset_type` (video, audio, master_image)
5. **Consistent Tagging**: All media types get AI-suggested tags before upload

---

## Technical Notes

### Audio MIME Types to Support
- `audio/mpeg` - MP3
- `audio/mp4`, `audio/x-m4a` - M4A
- `audio/wav` - WAV
- `audio/aac` - AAC
- `audio/flac` - FLAC
- `audio/ogg` - OGG

### S3 Path for Audio
Use a dedicated path: `audio-masters/` to organize audio files separately from video and images.

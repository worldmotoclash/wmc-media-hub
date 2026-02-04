
# Add Audio File Support to S3 Bucket Scan

## Problem
The S3 scan function completely ignores audio files. The current logic only recognizes video and image files:

| Current File Types | Supported |
|---|---|
| Video (mp4, m4v, mov, etc.) | ✅ Yes |
| Image (jpg, png, webp, etc.) | ✅ Yes |
| **Audio (m4a, mp3, wav, etc.)** | ❌ **No - skipped entirely** |

This is why your newly uploaded `.m4a` files don't appear after rescanning.

---

## Solution

Add audio file detection and indexing to the S3 scan function.

### Changes to `supabase/functions/scan-s3-buckets/index.ts`

**1. Add audio file detection function:**
```typescript
function isAudioFile(key: string): boolean {
  return /\.(mp3|wav|aac|flac|ogg|m4a|wma|aiff|alac|ape)$/i.test(key);
}
```

**2. Update `isMediaFile()` to include audio:**
```typescript
function isMediaFile(key: string): boolean {
  return isVideoFile(key) || isImageFile(key) || isAudioFile(key);
}
```

**3. Update `getAssetType()` to return audio type:**
```typescript
function getAssetType(key: string): 'video' | 'image' | 'audio' {
  if (isVideoFile(key)) return 'video';
  if (isAudioFile(key)) return 'audio';
  return 'image';
}
```

**4. Skip thumbnail linking for audio files:**
Audio files don't need video thumbnail matching, so update the thumbnail logic to only apply to video files.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/scan-s3-buckets/index.ts` | Add `isAudioFile()`, update `isMediaFile()` and `getAssetType()` |

---

## Audio Formats to Support

Based on the existing audio type detection in `videoContentService.ts`, we'll recognize:
- **m4a** - your uploaded files
- **mp3** - common audio format
- **wav** - uncompressed audio
- **aac** - advanced audio codec
- **flac** - lossless audio
- **ogg** - open format
- **wma** - Windows media audio
- **aiff** - Apple audio format
- **alac** - Apple lossless
- **ape** - Monkey's Audio

---

## Expected Result After Fix

1. Deploy updated edge function
2. Trigger a new S3 scan
3. Your m4a files will be imported as audio assets
4. Audio count in the filter will increase from 6 to include your new files

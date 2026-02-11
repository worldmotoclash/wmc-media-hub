

# Fix Upload Memory Limit + Add Video Bumper Skip for AI Analysis

## Problem 1: Upload Memory Limit
The current upload flow reads the entire file as base64 and sends it in a single JSON body to the `upload-master-to-s3` edge function. Large videos (100MB+) cause the edge function to exceed its ~150MB memory limit and crash.

**Solution**: Generate a presigned S3 URL from the edge function, then upload the file directly from the browser to S3 (bypassing the edge function for the heavy binary data). The edge function will only handle metadata, Salesforce sync, and database operations.

## Problem 2: Video Bumper Skip for AI Analysis
When analyzing a video with AI, a frame is extracted at ~1 second. Many videos have a standard bumper/intro that isn't representative of the actual content.

**Solution**: Add a "Skip intro" slider (0-30 seconds) that appears when a video file is selected. The AI analysis frame extraction will use this offset instead of the hardcoded 1-second seek time.

---

## Technical Changes

### 1. New Edge Function: `generate-presigned-upload-url`
- Accepts: filename, mimeType, width, height, title, description, tags, etc.
- Generates a presigned PUT URL for S3 using aws4fetch
- Returns the presigned URL and the S3 key to the client
- Does NOT receive the file binary

### 2. Modified Edge Function: `upload-master-to-s3`
- Add a new code path: when `imageBase64` is absent but `s3Key` is provided, skip the S3 upload step and proceed directly to database record creation and Salesforce sync
- This "finalize" path is called after the browser uploads directly to S3

### 3. `src/pages/media/MediaUpload.tsx` - Upload Flow
- For files over 50MB, use the new presigned URL flow:
  1. Call `generate-presigned-upload-url` to get a presigned S3 PUT URL
  2. Upload the file directly from the browser to S3 using `fetch(presignedUrl, { method: 'PUT', body: file })`
  3. Call `upload-master-to-s3` with the `s3Key` (no base64) to finalize metadata/Salesforce sync
- For files under 50MB, keep the existing base64 flow (it works fine)
- Show real upload progress using `XMLHttpRequest` with progress events

### 4. `src/pages/media/MediaUpload.tsx` - Bumper Skip UI
- Add new state: `bumperSkipSeconds` (default: 0)
- When a video file is selected, show a slider labeled "Skip intro (bumper)" with range 0-30 seconds
- The `extractVideoFrame` function will use `bumperSkipSeconds` as the seek time instead of the hardcoded `Math.min(1, video.duration * 0.1)`
- The `handleAnalyzeMedia` function passes the skip value to `extractVideoFrame`

### 5. Wasabi S3 CORS Configuration
- The presigned URL approach requires Wasabi to accept PUT requests from the browser origin. This may need a CORS configuration on the Wasabi bucket (the user may need to set this up in their Wasabi console).

---

## Flow Diagram

For large files (over 50MB):
```text
Browser                    Edge Function                   S3 (Wasabi)
  |                            |                              |
  |--generate-presigned-url--->|                              |
  |<--presigned PUT URL--------|                              |
  |                            |                              |
  |--PUT file directly---------|----------------------------->|
  |<--200 OK------------------|-------------------------------|
  |                            |                              |
  |--finalize (metadata)------>|                              |
  |   (no binary data)        |--create DB record             |
  |                            |--Salesforce sync             |
  |<--success-----------------|                              |
```


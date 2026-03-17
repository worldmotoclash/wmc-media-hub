

# Fix: Video Thumbnails Not Rendering in Diary Detail

## Root Cause

The upload pipeline (`upload-master-to-s3`) extracts a video frame client-side and uploads it as `thumbnail.jpg` to S3. However, when this thumbnail upload fails silently, the fallback logic sets `thumbnail_url` to the video's own `.mp4` URL (line 276: `thumbnailUrl || cdnUrl`). An `<img>` tag cannot render an MP4, so it shows a broken image.

The diary's `generate-diary-entry` function snapshots `thumbnail_url` from `media_assets` into the `content_items` JSONB, preserving the bad URL permanently.

## Plan

### 1. Fix DiaryDetail.tsx -- handle video URLs gracefully
- When `thumbnail_url` ends with a video extension (`.mp4`, `.mov`, `.webm`), treat it as if no thumbnail exists and show the asset type icon placeholder instead
- This provides an immediate visual fix for existing broken entries

### 2. Fix `upload-master-to-s3` fallback logic
- Change the fallback so videos without a successful thumbnail upload get `thumbnail_url: null` instead of `thumbnail_url: cdnUrl` (the video file)
- This prevents future bad data from being written

### 3. Fix `generate-diary-entry` -- resolve thumbnails at generation time
- When building `content_items`, check if `thumbnail_url` is null or ends with a video extension
- For videos, construct the expected thumbnail path (`VIDEOS_KNEWTV/masters/{masterId}/thumbnail.jpg`) and use it, or fall back to null
- This ensures newly generated diary entries have correct thumbnails even if the `media_assets` record has stale data

### 4. Add a re-generate button on DiaryDetail
- Allow re-generating the diary entry for the current date to refresh stale `content_items` snapshots with updated `thumbnail_url` values from `media_assets`


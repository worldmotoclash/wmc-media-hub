

# Add Large File Warning to Bulk Upload

## Problem
Users can select very large video files (100MB+, even 1GB+) without any warning about upload time. This is especially problematic on mobile where bandwidth is limited, but even on desktop with a wired connection, uploading a 1.2GB MOV file takes significant time.

## Solution
Add a warning toast/banner when files are added to the queue that exceed a size threshold. Two thresholds:
- **Mobile (iPhone)**: warn at 50MB per file, strongly warn at 200MB
- **Desktop**: warn at 200MB per file, strongly warn at 500MB

Also show total queue size summary so users understand the full upload commitment.

## Changes

### `src/components/media/BulkUploadTab.tsx`

1. **In `addFiles` callback**, after filtering valid files, check for large files:
   - Calculate total queue size (existing + new)
   - Identify files over the threshold (50MB mobile / 200MB desktop)
   - Show a toast warning listing the large file names and estimated upload time
   - Files are still added to the queue (not blocked), just warned about

2. **Add a total size summary** above the file list (e.g., "6 files queued — 1.7 GB total") so users can see the total payload at a glance

3. **Show a yellow warning banner** when total queue size exceeds 500MB:
   ```
   ⚠ Large upload: 1.7 GB total. This may take several minutes depending on your connection.
   ```

4. **On mobile specifically**, if any single file exceeds 200MB, show a stronger warning suggesting AirDrop to laptop first for faster upload.

### UI additions
- Total size badge next to "X files queued" heading
- Conditional yellow `Alert` banner when queue total > 500MB
- Toast on file add when individual files exceed threshold

## Files Modified

| File | Change |
|------|--------|
| `src/components/media/BulkUploadTab.tsx` | Add size threshold warnings, total size display, and conditional alert banner |


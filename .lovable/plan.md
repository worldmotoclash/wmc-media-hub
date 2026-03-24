

# Fix: Overall Progress Bar Not Reflecting Upload Percentage

## Problem

The overall progress bar only updates when a file **completes** (jumps from 0% to 100% in one step for a single file). It uses `completedCount / queue.length * 100`, so for 1 file queued, the bar stays at 0% the entire time until it finishes, then jumps to 100%.

The screenshot confirms this: 1 file queued, 24% uploaded per the individual file progress, but the overall bar shows 0%.

## Root Cause

Line 351: `overallProgress = (completedCount / queue.length) * 100` — this only counts fully completed files, ignoring per-file progress percentages that are already being tracked in the `queue` state.

## Fix

**`src/components/media/BulkUploadTab.tsx`**

Replace the `overallProgress` calculation (line 351) to aggregate individual file progress values instead of just counting completed files:

```typescript
const overallProgress = queue.length > 0
  ? queue.reduce((sum, f) => sum + f.progress, 0) / queue.length
  : 0;
```

This uses the per-file `progress` field (0-100) that's already being updated during XHR upload via `xhr.upload.onprogress`. The overall bar will now smoothly reflect the actual upload progress across all files.

One-line change. No other modifications needed.




# Fix: Album Filter Not Reflected in Total Asset Count

## Problem
When you select an album (e.g. "Utah Scout Location February 2026" with 25 items), the "total assets" badge still shows 290 because:

1. **Salesforce assets aren't album-aware**: The DB query correctly filters by `album_id`, but Salesforce API assets are fetched separately and never filtered by album. Their count gets added to the total on line 478: `total: (count || 0) + salesforceAssets.length`.

2. **Sidebar filter counts are global**: The `filterCounts` (Video 527, Image 2935, etc.) are loaded once from `getMediaSourceStats()` without any album context, so they always show global numbers.

## Fix

### 1. Skip Salesforce fetch when album filter is active
**File**: `src/services/unifiedMediaService.ts`

Since Salesforce has no album concept, when `filters.albumId` is set, skip the Salesforce API call entirely (similar to the existing optimization that skips Salesforce for DB-only asset types). This makes the total count accurate — it will only reflect the DB count which is correctly filtered by `album_id`.

### 2. Pass album filter to sidebar counts
**File**: `src/components/media/UnifiedMediaLibrary.tsx`

Update `loadFilterCounts()` to pass the current `albumId` filter to `getMediaSourceStats()`, so the sidebar numbers (Video, Image, Masters, etc.) reflect the selected album's contents rather than the global library.

**File**: `src/services/mediaSourceStatsService.ts` (or wherever `getMediaSourceStats` lives)

Accept an optional `albumId` parameter and add `.eq('album_id', albumId)` to each count query when present.


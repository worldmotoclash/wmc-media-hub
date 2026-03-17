

# Add Tag-Based Filtering to Media Library

## Current State
- Search scopes "All" and "Metadata" already match against tag names in the text search
- But there's no way to filter by specific tags (e.g., pick "Racer Submission" from a list)
- The `MediaFilterDrawer` has Category, Content Type, Location, and Mood filters — but no Tags section

## Plan

### 1. Add `tagIds` to `SearchFilters` type
**File**: `src/services/unifiedMediaService.ts`

Add an optional `tagIds?: string[]` field to the `SearchFilters` interface.

### 2. Apply tag filter in the DB query
**File**: `src/services/unifiedMediaService.ts`

When `filters.tagIds` is set, query `media_asset_tags` to get matching `media_asset_id` values, then filter the main query using `.in('id', matchingIds)`. This ensures only assets with ALL selected tags (or ANY — we can use ANY for better UX) are returned.

### 3. Add Tags section to `MediaFilterDrawer`
**File**: `src/components/media/MediaFilterDrawer.tsx`

Add a new collapsible "Tags" section that loads available tags from the `media_tags` table (already fetched via `fetchMediaTags()`). Display them as checkboxes like the other filter sections. Pass `tags` as a prop from `UnifiedMediaLibrary`.

### 4. Wire up in `UnifiedMediaLibrary`
**File**: `src/components/media/UnifiedMediaLibrary.tsx`

Pass the loaded `tags` array to `MediaFilterDrawer`. Handle `tagIds` filter changes alongside existing filters. Include tag count in the active filter badge.


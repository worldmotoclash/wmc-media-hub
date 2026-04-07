

# Sort Album Lists Alphabetically (Case-Insensitive) Everywhere

## Problem
Album dropdown lists appear in multiple places across the Media Hub but are sorted inconsistently — some by date, some by name (case-sensitive). Users expect a consistent, alphabetical, case-insensitive sort.

## Locations to Fix

| Location | Current Sort | Fix |
|----------|-------------|-----|
| **UnifiedMediaLibrary.tsx** (line 788) — album filter dropdown | Toggle between date/name; name sort is case-sensitive (`localeCompare` without options) | Default to name; use `localeCompare('en', { sensitivity: 'base' })` |
| **BulkUploadTab.tsx** (line 89, 477) — "existing album" dropdown | Fetched ordered by `created_at desc`; rendered unsorted | Sort with case-insensitive `localeCompare` before rendering |
| **MediaAssetDetailsDrawer.tsx** (line 70) — album reassignment dropdown | Fetched ordered by `name` (Supabase default = case-sensitive) | Add `.localeCompare` sort client-side after fetch |

## Changes

### 1. `src/components/media/UnifiedMediaLibrary.tsx`
- **Line 788**: Change the sort comparator to always use case-insensitive alphabetical:
  ```typescript
  a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })
  ```
- **Line 112**: Default `albumSortBy` to `'name'` instead of `'date'`

### 2. `src/components/media/BulkUploadTab.tsx`
- **Line 107**: After building `activeAlbums`, sort before setting state:
  ```typescript
  activeAlbums.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  ```

### 3. `src/components/media/MediaAssetDetailsDrawer.tsx`
- **Line 71**: Sort after fetch:
  ```typescript
  if (data) setAlbums(data.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })));
  ```

Three files, ~4 lines changed total.


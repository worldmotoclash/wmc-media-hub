

# Weekly Summary View for Content Diary

## Approach
Add a tabbed interface to the existing `DiaryDashboard` with "Daily" and "Weekly" views. The weekly view groups entries by `week_start` (already stored in the DB) and shows aggregate totals per week. Pure client-side grouping -- no DB or edge function changes needed.

## Changes

### File: `src/pages/media/DiaryDashboard.tsx`

1. **Add Tabs** (`Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`) to toggle between "Daily" (current list) and "Weekly" views
2. **Compute weekly groups** from the fetched entries: group by `week_start`, sum `video_count`, `image_count`, `audio_count` per group, count days with entries
3. **Weekly view UI**: Accordion-style cards, one per week, showing:
   - Week label: "Week of Mar 10, 2026"
   - Aggregate video/image/audio counts and total items
   - Number of active days that week
   - Click to expand and show individual daily entries within that week (each clickable to navigate to `/mediahub/diary/:date`)

### Data flow
- `week_start` column already exists on `media_diary_entries` and is populated by `generate-diary-entry`
- Group client-side: `Object.groupBy` or reduce into a `Map<string, DiaryEntry[]>` keyed by `week_start`
- Sort weeks descending

### No other files affected
Single-file UI change within `DiaryDashboard.tsx`.


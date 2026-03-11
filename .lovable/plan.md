

# MediaHub Daily Content Diary

## Database

New table `media_diary_entries`:

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, gen_random_uuid() |
| date | date | NOT NULL, UNIQUE |
| video_count | integer | DEFAULT 0 |
| image_count | integer | DEFAULT 0 |
| audio_count | integer | DEFAULT 0 |
| summary_text | text | nullable |
| content_items | jsonb | DEFAULT '[]' |
| week_start | date | nullable (Monday of that week) |
| salesforce_synced | boolean | DEFAULT false |
| created_at | timestamptz | DEFAULT now() |
| updated_at | timestamptz | DEFAULT now() |

RLS: SELECT open (true), INSERT/UPDATE/DELETE open (true) — matches existing media_assets pattern.

Trigger: `update_updated_at_column` on UPDATE (reuse existing function).

## Edge Function: `generate-diary-entry`

Called with a `date` param (defaults to today). Steps:

1. Query `media_assets` for that date, group by `asset_type` to get video/image/audio counts
2. If total count is 0, return early (no entry created per rules)
3. Collect content items (id, title, asset_type, thumbnail_url, file_url) as JSONB array
4. Calculate `week_start` (most recent Monday)
5. Generate a simple `summary_text` from the counts
6. Upsert into `media_diary_entries` (keyed on `date`)
7. POST to w2x-engine for Salesforce sync:

```
sObj: MediaHub_Diary__c
action: upsert
externalIdField: Diary_Date__c
string_Name: "2026-03-10"
date_Diary_Date__c: "2026-03-10"
text_Summary__c: "..."
number_Video_Count__c: 4
number_Image_Count__c: 12
number_Audio_Count__c: 2
string_Diary_URL__c: "https://mediahub.worldmotoclash.com/diary/2026-03-10"
date_Week_Start__c: "2026-03-09"
```

8. Mark `salesforce_synced = true` on success

## New Pages

### `/mediahub/diary` — Diary Dashboard

- Auth-guarded (same as MediaHub)
- **Admin metrics** at top: total entries, last update date, total media items this week
- **Chronological list** of entries, newest first
- Each card: formatted date, video/image/audio counts, total
- Click navigates to `/mediahub/diary/:date`
- "Generate Today's Entry" button calls the edge function

### `/mediahub/diary/:date` — Diary Detail

- Editorial summary
- Grid of content items with thumbnails/previews
- Reuses `ImagePreviewModal` / `VideoPreviewModal`
- Back link to diary list

## Files to Create/Edit

| File | Action |
|------|--------|
| `src/pages/media/DiaryDashboard.tsx` | Create |
| `src/pages/media/DiaryDetail.tsx` | Create |
| `supabase/functions/generate-diary-entry/index.ts` | Create |
| `src/App.tsx` | Add routes |
| `src/components/media/MediaNavigation.tsx` | Add breadcrumb entries |
| `src/components/media/ActionCards.tsx` | Add "Content Diary" card |
| `supabase/config.toml` | Add function config |

## Auto-Login Token

Diary URLs from Salesforce emails include `?token={base64_email}`. DiaryDetail checks this param, decodes it, auto-sets user context via localStorage (`wmcUser` pattern), then strips the token from the URL.


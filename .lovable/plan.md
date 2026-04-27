## Overview

Build a separate, secure server-to-server ingestion endpoint specifically for **Media Hub content-upload reports** (daily and weekly), with its own DB table, edge function, archive page, and detail pages. This is parallel to — and fully isolated from — the existing `social-performance-ingest` / `social_performance_reports` system.

The new feature will follow the exact same proven patterns already in production for social performance reports (constant-time bearer auth, service-role upsert, status preservation on re-ingest, structured JSON storage with `raw_payload`).

## 1. Database — new table `mediahub_content_reports`

Migration creating a dedicated table:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `report_id` | text UNIQUE | e.g. `mediahub-daily-2026-04-26` (upsert key) |
| `report_type` | text | always `mediahub_content_report` |
| `period_type` | text | `daily` or `weekly` (CHECK constraint) |
| `title` | text | from payload |
| `slug` | text UNIQUE | `mediahub-daily-report-YYYY-MM-DD` or `mediahub-weekly-report-YYYY-week-WW` |
| `report_date` | date | |
| `period_start` | date | |
| `period_end` | date | |
| `heading` | text | nullable |
| `subheading` | text | nullable |
| `summary_text` | text | |
| `asset_counts` | jsonb | `{videos, images, audio, other, total}` |
| `assets` | jsonb | array of asset objects |
| `day_breakdown` | jsonb | nullable; weekly only |
| `generated_at` | timestamptz | |
| `status` | text | default `draft`, but new ingests insert as `published` (matches social pattern) |
| `raw_payload` | jsonb | full original payload for audit |
| `page_url` | text | absolute mediahub URL |
| `created_at` / `updated_at` | timestamptz | with trigger using existing `update_updated_at_column()` |

**RLS:** enabled; only one SELECT policy: `status = 'published'` (mirrors `social_performance_reports`). All writes happen via the edge function with service-role key, bypassing RLS.

**Indexes:** unique on `report_id` and `slug`; btree on `(period_type, report_date DESC)` for archive queries.

## 2. Edge function — `mediahub-content-report-ingest`

New file: `supabase/functions/mediahub-content-report-ingest/index.ts`. Server-to-server only; no browser CORS needed (same as `social-performance-ingest`).

**Auth:** `Authorization: Bearer <token>` checked with constant-time compare against env `MEDIAHUB_CONTENT_REPORT_INGEST_TOKEN`. (You'll add this secret after I prompt for it.)

**Validation** (returns 400 with `{ ok: false, error: "validation_failed", details: [{field, message}] }`):
- `report_type` required, must equal `mediahub_content_report`
- `period_type` required, must be `daily` or `weekly`
- `generated_at` required, valid ISO 8601
- `report_date` required, valid `YYYY-MM-DD`
- `title` required, non-empty string
- `summary_text` required, non-empty string
- `asset_counts` required object with numeric `videos`, `images`, `audio`, `other`, `total`
- `assets` required array
- `period_start`/`period_end` required for weekly (warn-but-accept missing for daily)
- For weekly: if `day_breakdown` present, must be array

**Slug + report_id derivation:**
- Daily: `slug = mediahub-daily-report-YYYY-MM-DD`, `report_id = mediahub-daily-YYYY-MM-DD`
- Weekly: ISO week of `report_date` → `slug = mediahub-weekly-report-YYYY-week-WW`, `report_id = mediahub-weekly-YYYY-week-WW` (zero-padded)

**Upsert behavior** (matches social pattern exactly):
- Look up by `report_id`
- If exists → UPDATE all fields except `status` (preserves manual unpublish)
- If new → INSERT with `status = 'published'` so the returned URL works immediately

**Logging:** structured JSON line with event/report_id/period_type/created/updated. Never logs the bearer token.

**Response:**
```json
{ "ok": true, "reportId": "...", "created": true, "updated": false,
  "url": "https://mediahub.worldmotoclash.com/content-reports/{daily|weekly}/{slug}" }
```

**config.toml:** add `[functions.mediahub-content-report-ingest] verify_jwt = false` (matches `social-performance-ingest`).

## 3. Frontend routes & pages

Add to `src/App.tsx`:
- `/content-reports` → `ContentReportsArchive`
- `/content-reports/daily/:slug` → `ContentReportDetail` (period_type filter applied)
- `/content-reports/weekly/:slug` → `ContentReportDetail`

New files:
- `src/pages/reports/ContentReportsArchive.tsx` — two tabs (Daily | Weekly), each showing a card list with: report_date / period range, asset counts (videos/images/audio/other/total chips), summary preview, link to detail page. Range selector reused from existing `RangeSelector` component.
- `src/pages/reports/ContentReportDetail.tsx` — renders title / heading / subheading / generated date / editorial summary / 5 count cards (videos, images, audio, other, total) / asset grid (name, type badge, created date, external-link button). For weekly reports, also renders `day_breakdown` as collapsible day sections with their own counts and items.

Both pages query `mediahub_content_reports` (RLS auto-filters to published rows for anon users).

## 4. Token generation & delivery

After you approve this plan, I'll:
1. Generate a strong random token (32 bytes, base64url) on the sandbox
2. Print it once in chat so you can copy it into your local automation
3. Use the secrets tool to store it as `MEDIAHUB_CONTENT_REPORT_INGEST_TOKEN`
4. Deploy the edge function

The token will only ever exist in chat output (for you) and the server secret store — never in the codebase.

## 5. Deliverables I'll give you after build

- Endpoint URL: `https://vlwumuuolvxhiixqbnub.supabase.co/functions/v1/mediahub-content-report-ingest`
- The generated bearer token (one-time display)
- Env var name: `MEDIAHUB_CONTENT_REPORT_INGEST_TOKEN`
- Table name: `mediahub_content_reports`
- Daily route: `/content-reports/daily/:slug`
- Weekly route: `/content-reports/weekly/:slug`
- Archive route: `/content-reports`
- `curl` example for daily payload
- `curl` example for weekly payload
- Confirmation: **new ingests default to `published`**; re-ingest preserves any manual status flip

## Files touched

**New:**
- `supabase/migrations/<timestamp>_create_mediahub_content_reports.sql`
- `supabase/functions/mediahub-content-report-ingest/index.ts`
- `src/pages/reports/ContentReportsArchive.tsx`
- `src/pages/reports/ContentReportDetail.tsx`

**Modified:**
- `supabase/config.toml` (register new function with `verify_jwt = false`)
- `src/App.tsx` (3 new routes)

## Out of scope (no changes)

- `social_performance_reports` table, `social-performance-ingest` function, `/reports*` routes
- Any blog/story endpoint on worldmotoclash.com
- Existing Media Hub upload, sync, or diary flows

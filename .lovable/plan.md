# Racer Contact Daily Log Reports

Add a new, separate report family for racer contact daily logs, modeled directly on the existing `mediahub_content_reports` / `mediahub-content-report-ingest` pattern. Kept fully isolated from `/reports` and `/content-reports`.

## 1. Database

New migration creating `racer_contact_reports`:

- `id uuid pk`
- `report_id text unique` — `racer-contact-daily-log-YYYY-MM-DD`
- `report_type text default 'racer_contact_report'`
- `slug text unique`
- `report_date date unique` (idempotency key)
- `title text`, `heading text`, `subheading text`, `summary_text text`
- `status text default 'draft'` (new ingests insert as `published`)
- `generated_at timestamptz`
- `totals jsonb`, `field_completion jsonb`, `status_counts jsonb`
- `created_today_contacts jsonb`, `new_contacts jsonb`, `updated_contacts jsonb`, `regressions jsonb`, `missing_critical jsonb`, `recent_contacts jsonb`, `contacts jsonb`
- `raw_payload jsonb` (full payload preserved)
- `page_url text`
- `created_at`, `updated_at` timestamps

RLS: enable; single public SELECT policy `status = 'published'` (same as `mediahub_content_reports`). No public insert/update/delete — writes happen via service role in the edge function.

Index on `report_date desc` for archive ordering.

## 2. Edge Function: `racer-contact-report-ingest`

New function at `supabase/functions/racer-contact-report-ingest/index.ts`, registered in `supabase/config.toml` with `verify_jwt = false`.

Behavior, copying the structure of `mediahub-content-report-ingest`:

- POST JSON only; OPTIONS returns 204.
- Bearer-token auth via new secret `RACER_CONTACT_REPORT_INGEST_TOKEN` (constant-time compare). Will request the secret value from the user before deploy is useful — function deploys regardless and returns `server_misconfigured` until set.
- Validate:
  - `report_type === "racer_contact_report"`
  - `report_date` matches `YYYY-MM-DD`
  - `generated_at` is ISO datetime
  - `title`, `summary_text` non-empty
  - `totals` is an object with numeric `total_contacts`, `created_today`, `new_vs_previous`, `updated_contacts`, `regressions`, `contact_profiles_complete`, `readiness_profiles_started`
  - array fields, when present, must be arrays
- Derive `slug = racer-contact-daily-log-YYYY-MM-DD`, `report_id = racer-contact-daily-{date}`, `page_url = https://mediahub.worldmotoclash.com/racer/reports/{slug}`.
- Upsert keyed by `report_date` (select existing → update preserves `status`; insert sets `status = 'published'`). Stores both the parsed sub-objects and `raw_payload`.
- Returns `{ ok: true, slug, report_date, url, created, updated }`.

## 3. Frontend Routes

In `src/App.tsx`, add (alongside the other report routes):

- `/racer/reports` → `RacerContactReportsArchive`
- `/racer/reports/:slug` → `RacerContactReportDetail`

Note: these live under `/racer/...` but are public report pages, not part of the racer portal auth flow. Acceptable since the existing racer routes are not gated at the route level either.

## 4. Archive Page — `src/pages/racer/reports/RacerContactReportsArchive.tsx`

Mirrors `ContentReportsArchive` styling (container, header, card grid, skeletons).

- Query `racer_contact_reports` ordered `report_date desc`, limit 500.
- Card per report shows:
  - Date (formatted from `report_date`, noon-UTC anchor)
  - Heading / title
  - Chips: `total_contacts`, `created_today`, `new_vs_previous`, `updated_contacts`, `contact_profiles_complete`, `readiness_profiles_started`
- Click → `/racer/reports/{slug}`.
- SEO: `<title>Racer Contact Daily Logs — World Moto Clash</title>`.

## 5. Detail Page — `src/pages/racer/reports/RacerContactReportDetail.tsx`

Mirrors `ContentReportDetail` layout (top summary cards, sections in `Card` wrappers, dark theme tokens).

Sections, in order:

1. **Header** — heading, subheading, generated-at, back link to `/racer/reports`.
2. **Summary cards** — total contacts, created today, new vs previous, updated contacts, complete profiles, readiness started (reuses a small `CountCard` like the content-report one).
3. **Summary text** — paragraph.
4. **Field completion snapshot** — table of label / count from `field_completion`.
5. **Status snapshot** — four sub-tables (`media_release_status`, `racing_license`, `white_glove_scheduled`, `scoring_compete`) rendered as label / count pairs.
6. **Contacts created today** — table; empty → "None today."
7. **New vs previous snapshot** — table from `new_contacts`; empty state.
8. **Recently updated contacts** — table; render `changed_fields` column when present (comma-joined or chips), otherwise hide column.
9. **Regressions** — table; hide section header subtitle when empty, show "None" body.
10. **Missing critical fields** — table; empty state.
11. **Newest racer contacts** — table from `recent_contacts` (or fall back to first N of `contacts`).

Contact rows render whatever fields exist defensively (name/email/mobile/id), with racer IDs in a `font-mono` span. All tables use existing `@/components/ui/table` primitives.

## 6. Shared helpers

Small local helpers inside the detail file (kept local to avoid a new shared module):

- `fmtDate`, `fmtDateTime`, `fmt(n)` — copied from `ContentReportDetail`.
- `KeyCountTable({ data })` — renders a `Record<string, number>` as a two-column table; reused for field completion + each status group.
- `ContactsTable({ rows, columns })` — generic mini-table for the contact list sections.

## 7. Out of scope

- No changes to `/reports`, `/content-reports`, or the existing ingest functions.
- No auth gating on the new pages (matches existing report archives).
- No Lovable Publish — caller is responsible.

## Files

New:
- `supabase/functions/racer-contact-report-ingest/index.ts`
- `src/pages/racer/reports/RacerContactReportsArchive.tsx`
- `src/pages/racer/reports/RacerContactReportDetail.tsx`

Edited:
- `supabase/config.toml` — register new function with `verify_jwt = false`
- `src/App.tsx` — add two routes
- DB migration creating `racer_contact_reports` + RLS

Secrets:
- `RACER_CONTACT_REPORT_INGEST_TOKEN` — will request from user after plan approval.

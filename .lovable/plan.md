## Social Performance Report Ingestion Endpoint

### Architecture note
This project is a Vite/React SPA hosted on Lovable, backed by Supabase. There is no Node.js/Express server we can attach an `/api/...` route to. The correct "server-side" implementation here is a **Supabase Edge Function** (Deno runtime, runs server-side, secrets stay out of the browser). The endpoint will live at the Supabase Functions URL, and we can document it as the canonical ingest URL for your automation.

### 1. Endpoint
- **Edge function name:** `social-performance-ingest`
- **Public URL (what your automation POSTs to):**
  `https://vlwumuuolvxhiixqbnub.supabase.co/functions/v1/social-performance-ingest`
- Method: `POST`, JSON only
- `verify_jwt = false` in `supabase/config.toml` (we authenticate via our own bearer token, not Supabase auth)
- Auth header: `Authorization: Bearer <MEDIAHUB_SOCIAL_REPORT_INGEST_TOKEN>`
- CORS: closed by default (server-to-server use). We will not allow browser origins.

### 2. Bearer token
- Generate a 48-byte random hex token (96 chars) at plan-execution time.
- Store as Supabase secret: `MEDIAHUB_SOCIAL_REPORT_INGEST_TOKEN`.
- Token value will be returned to you **once** in chat after creation. It will not be embedded in any frontend code, route, or env file checked into the repo.
- Edge function reads it via `Deno.env.get('MEDIAHUB_SOCIAL_REPORT_INGEST_TOKEN')` and compares using a constant-time check.

### 3. Database — new table `social_performance_reports`

Migration will create:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `report_id` | text UNIQUE | e.g. `social-performance-2026-04-20` (daily dedupe key) |
| `report_type` | text | default `'social_performance'` |
| `title` | text | e.g. `World Moto Clash Social Performance Report, Apr 20 2026` |
| `slug` | text UNIQUE | e.g. `social-performance-report-2026-04-20` |
| `report_date` | date | derived from `generated_at` (UTC date) |
| `generated_at` | timestamptz | from payload |
| `since` | timestamptz | from payload |
| `total_posts` | integer | from `totals.posts` |
| `total_views` | bigint | from `totals.views` |
| `total_engagements` | bigint | from `totals.engagements` |
| `total_clicks` | bigint | from `totals.clicks` |
| `platforms` | jsonb | full `platforms[]` array |
| `top_overall` | jsonb | full `top_overall[]` array |
| `raw_payload` | jsonb | full original payload (audit/debug) |
| `status` | text | default `'draft'` (other values: `published`) |
| `page_url` | text | computed: `https://mediahub.worldmotoclash.com/reports/<slug>` |
| `created_at` / `updated_at` | timestamptz | trigger-managed |

**RLS:**
- Enable RLS.
- `SELECT` policy: `status = 'published'` is publicly viewable; drafts only readable via service role (edge functions). This keeps drafts private until you flip them.
- No public INSERT/UPDATE/DELETE — writes only happen through the edge function using the service role key.

**Default status:** `draft` — matches your "default to private/internal first" requirement.

### 4. Edge function logic (`supabase/functions/social-performance-ingest/index.ts`)

1. Accept `POST` only (405 otherwise).
2. Verify `Authorization: Bearer <token>` against the secret (constant-time compare). On mismatch → `401 { ok: false, error: "unauthorized" }`. Never log the token.
3. Parse JSON body. On parse failure → `400 { ok: false, error: "invalid_json" }`.
4. Validate required fields with Zod:
   - `generated_at` (ISO datetime string, required)
   - `since` (ISO datetime string, required)
   - `totals` (object, required) with `posts`, `views`, `engagements`, `clicks` (numbers)
   - `platforms` (array, required)
   - Optional: `top_overall`, `records`
   - On failure → `400 { ok: false, error: "validation_failed", details: [{field, message}, ...] }`
5. Derive:
   - `report_date` = UTC date of `generated_at`
   - `report_id` = `social-performance-<YYYY-MM-DD>`
   - `slug` = `social-performance-report-<YYYY-MM-DD>`
   - `title` = `World Moto Clash Social Performance Report, <Mon DD YYYY>`
   - `page_url` = `https://mediahub.worldmotoclash.com/reports/<slug>`
6. **Upsert** by `report_id` using service role client. Detect created vs updated by checking existence first (or using `.upsert(..., { onConflict: 'report_id' })` with a prior existence query).
7. Log a structured line: `{ event: "ingest", report_id, created, updated, report_date }` — no token, no full payload.
8. Return:
   - Created → `200 { ok: true, reportId, created: true, updated: false, url }`
   - Updated → `200 { ok: true, reportId, created: false, updated: true, url }`

### 5. Frontend pages (rendered from structured JSON)

Two new public routes added to `src/App.tsx`:

- `/reports` → `ReportsArchive.tsx`
  Lists all `status='published'` reports sorted by `report_date` desc. Columns: report date, posts, views, engagements, clicks, link.
- `/reports/:slug` → `SocialPerformanceReport.tsx`
  Fetches one report by slug. Renders:
  - Title + report date + reporting window (`since` → `generated_at`)
  - Top-level totals cards (posts / views / engagements / clicks)
  - Platform summary cards (one per `platforms[]` entry with its totals)
  - Top leaders section from `top_overall[]` (post name, platform badge, metrics, link to `post_url`)
  - Per-platform breakdown with each platform's `top_posts[]`
  - All numbers/strings come from the structured columns + `platforms`/`top_overall` jsonb. `raw_payload` is **not** rendered — kept only for audit.

Both pages query Supabase directly using the anon key (RLS limits anon to `status='published'` rows, so drafts stay hidden).

### 6. Files to add / change

| File | Change |
|---|---|
| `supabase/functions/social-performance-ingest/index.ts` | New edge function (auth, validation, upsert, logging) |
| `supabase/config.toml` | Add `[functions.social-performance-ingest] verify_jwt = false` |
| Supabase migration | Create `social_performance_reports` table, indexes on `report_id`, `slug`, `report_date`, `status`; RLS policies; `updated_at` trigger |
| Supabase secret | Add `MEDIAHUB_SOCIAL_REPORT_INGEST_TOKEN` |
| `src/pages/reports/ReportsArchive.tsx` | New archive/index page |
| `src/pages/reports/SocialPerformanceReport.tsx` | New detail page |
| `src/App.tsx` | Register `/reports` and `/reports/:slug` routes |

### 7. What you'll get back after build

After implementation I'll give you:
- Endpoint URL (Supabase functions URL above)
- The generated bearer token (shown once)
- Env var name: `MEDIAHUB_SOCIAL_REPORT_INGEST_TOKEN`
- Table/schema summary
- Detail page URL pattern: `https://mediahub.worldmotoclash.com/reports/social-performance-report-YYYY-MM-DD`
- Archive URL: `https://mediahub.worldmotoclash.com/reports`
- A `curl` example using your sample payload
- Confirmation that imported reports default to **draft** (private) and how to flip to `published`

### 8. Open question — please confirm before I build

Your spec says "endpoint on the MediaHub site" with path `/api/mediahub/social-performance-ingest`. Because this app is a Vite SPA with no Node server, the actual server-side endpoint must be the Supabase Edge Function URL:

`https://vlwumuuolvxhiixqbnub.supabase.co/functions/v1/social-performance-ingest`

That URL is fully server-side, secret-safe, and is the standard pattern for this stack. If you need the URL to literally live under `mediahub.worldmotoclash.com/api/...`, that requires adding a reverse-proxy/rewrite rule at the hosting/DNS layer (Lovable custom domain → Supabase function), which is outside what I can configure from code. **Is the Supabase functions URL acceptable, or do you want me to also document the reverse-proxy setup you'd need to expose it under your MediaHub domain?**
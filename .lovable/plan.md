# Update Social Performance Report Rendering — Clicks vs Shares

The ingest payload now distinguishes click-based platforms (Facebook, Twitter, LinkedIn) from share-based platforms (YouTube, Instagram, TikTok). Update DB schema, ingest, and all report UI to use the new fields exactly as provided.

## 1. Database — add `total_shares` column

New migration adding `total_shares BIGINT NOT NULL DEFAULT 0` to `social_performance_reports` so KPI queries don't have to crack `raw_payload` on every read.

(`total_clicks` stays — it now means **click-based platforms only**, matching the new payload semantics. Historical rows keep their existing values; `total_shares` defaults to 0 for them.)

## 2. Ingest function — `supabase/functions/social-performance-ingest/index.ts`

- Accept `totals.shares`, `totals.all_clicks`, `totals.all_shares` (validate as finite numbers; `shares` required, the `all_*` ones optional).
- Persist `total_shares = Math.trunc(payload.totals.shares)` into the new column.
- Continue storing the entire payload in `raw_payload` so `presentation.*` and per-platform `metric_mode`, `display_name`, `primary_metric_*`, `sort_order`, `clicks`, `shares` flow through untouched.

## 3. Detail page — `src/pages/reports/SocialPerformanceReport.tsx`

### Top summary cards (5 cards instead of 4)
Posts · Views · Engagements · **Clicks** (`total_clicks`, label "Clicks (FB/Tw/LI)") · **Shares** (`total_shares`, label "Shares (YT/IG/TT)"). Responsive: `grid-cols-2 md:grid-cols-3 lg:grid-cols-5`. Never combine clicks + shares.

### Platform Summary — two clearly separated rows
Read `presentation.click_first_platforms` and `presentation.share_first_platforms` from `raw_payload` for ordering; fall back to filtering `platforms[]` by `metric_mode` and sorting by `sort_order`, then by the canonical order:
- Row 1 (Clicks): Facebook, Twitter, LinkedIn
- Row 2 (Shares): YouTube, Instagram, TikTok

Each row gets a small section heading ("Click-based platforms" / "Share-based platforms") and its own grid. Each platform card shows: Posts, Views, Engagements, and a fourth metric driven by `primary_metric_label` + `primary_metric_value` (so YT/IG/TT show **Shares**, not a misleading 0 Clicks).

Use `display_name` for the card title (fallback to capitalized `platform`).

### Per-Platform Breakdown
For each platform's section and `top_posts` table, the metric column after Engagements is dynamic:
- header text = `platform.primary_metric_label`
- cell value = `post.primary_metric_value` (fall back to `post.clicks` when `metric_mode === "clicks"`, else `post.shares`)

Order the per-platform sections the same way: clicks group first (FB, Tw, LI), then shares group (YT, IG, TT).

### Top Leaders
Each `PostRow` already shows Views/Engagements/Clicks. Replace the third metric with the post's `primary_metric_label` / `primary_metric_value` (falling back to platform-level `metric_mode` when the post-level fields are missing on legacy data).

## 4. Archive page — `src/pages/reports/ReportsArchive.tsx`

- Select `total_shares` alongside existing columns.
- KPI strip: add a fifth "Shares" card next to Clicks using `latest.total_shares`. Grid becomes `grid-cols-2 md:grid-cols-3 lg:grid-cols-5`.
- Per-row mini metrics in the report list: add Shares next to Clicks.

## 5. PlatformBreakdownChart — `src/components/reports/PlatformBreakdownChart.tsx`

For each platform, decide its primary metric using `metric_mode` (or fallback: shares > clicks). Replace the single `Clicks` bar with a `Primary` bar whose value is the platform's primary metric and whose tooltip/legend label reflects mixed semantics ("Clicks/Shares"). Keep Views and Engagements bars unchanged. Sort/group bars so click-first platforms appear before share-first ones.

## 6. Types

Update `ReportRow` / `PlatformBlock` / `TopPost` interfaces in both pages to include the new optional fields (`total_shares`, `display_name`, `metric_mode`, `primary_metric_label`, `primary_metric_value`, `clicks`, `shares`, `sort_order`) and a typed `presentation` block on `raw_payload`. All new fields are optional so legacy rows continue to render (they fall back to the old `clicks`-only layout, with the Shares card showing 0).

## Files changed
- `supabase/migrations/<new>.sql` (add `total_shares`)
- `supabase/functions/social-performance-ingest/index.ts`
- `src/pages/reports/SocialPerformanceReport.tsx`
- `src/pages/reports/ReportsArchive.tsx`
- `src/components/reports/PlatformBreakdownChart.tsx`

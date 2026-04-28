# Fix Summary Cards: Show Latest Snapshot, Not Summed Totals

## Problem

Each daily report in `social_performance_reports` stores a **cumulative snapshot** (Apr 28 = 1,515,953 views, Apr 27 = 1,467,648 views, etc. — each day grows over the prior). The current archive page sums every report in the selected window, producing inflated numbers like 16,789,403 views across 25 reports.

The newest report (Apr 28) shows 1,515,953 views on its detail card — that's the actual current total. The summary should match.

## Fix

Replace the `reduce(... + r.total_views ...)` aggregation with **the latest report's values within the filtered window**.

### Logic

```text
filteredReports = sorted desc by report_date, filtered by selected range
latestReport    = filteredReports[0]   // most recent in window

summary = {
  totalPosts:       latestReport.total_posts,
  totalViews:       latestReport.total_views,
  totalEngagements: latestReport.total_engagements,
  totalClicks:      latestReport.total_clicks,
}
```

So for ALL → shows Apr 28 totals (1,515,953 views). For 7D → shows the most recent report within the last 7 days (also Apr 28 right now). For 30D → same, etc. The numbers always equal what the user sees on the top report card.

### Labels

Change KPI labels from `TOTAL POSTS / TOTAL VIEWS / ...` to `POSTS / VIEWS / ENGAGEMENTS / CLICKS` (since they are snapshot values, not window sums). Add an "as of <date>" sub-label using `latestReport.report_date` so it's clear what the number represents.

### Period strip

Keep the existing range pill (`ALL REPORTS`, `LAST 30 DAYS`) and the `25 reports · 2026-04-04 → 2026-04-28` line — those describe the **list/chart window** correctly.

### Chart and list

No change. `ReportsTrendChart`, `PlatformBreakdownChart`, and the report list continue to use the full `filteredReports` array — the trend chart should show the per-day snapshot progression.

## File touched

- `src/pages/reports/ReportsArchive.tsx` — replace the `reduce` aggregation in the `useMemo` with `latestReport`-based values; tweak KPI labels and add an "as of YYYY-MM-DD" caption under each KPI value.

## Confirmation after publish

I will confirm:
- Default selected range is still `ALL`
- Summary cards now show **exact latest-report totals** (e.g. 1,515,953 views) matching the Apr 28 card
- Switching ranges updates the summary to the latest report inside that window

## Refactor `/reports` (ReportsArchive) — single source of truth

### State changes
- Change `useState<Range>("30d")` → `useState<Range>("ALL")` so ALL is active on first load.
- Update `RangeSelector`'s `Range` type and `rangeToDays` to use `"ALL"` (uppercase) to match the spec; update option list labels accordingly (already mostly uppercase). Keep other tokens lowercase internally is fine — the simplest move is to keep existing lowercase `"all"` value but display "ALL" (already does). I'll just switch the default to `"all"` and rename nothing to avoid breaking the selector. The user-facing label stays `ALL`.

### Filtering — one collection
Rename `rows` → `allReports`. Compute a single memoized `filteredReports`:

```
filteredReports = selectedRange === 'all'
  ? allReports
  : allReports.filter(r => new Date(r.report_date) >= today - Ndays)
```

### Summary metrics — totals, not deltas
Replace the latest-minus-earliest delta logic with straight aggregate sums over `filteredReports`:

```
totalPosts       = sum(filteredReports.total_posts)
totalViews       = sum(filteredReports.total_views)
totalEngagements = sum(filteredReports.total_engagements)
totalClicks      = sum(filteredReports.total_clicks)
reportCount      = filteredReports.length
```

Note: the existing delta logic existed because earlier ingests were assumed cumulative. Per the new spec, treat each report's totals as the report's own totals for that day and SUM them across the filtered window. (Acceptance criterion explicitly requests `Apr 28 report appears with 1,515,953 views` — that's a per-report value, and ALL aggregation will sum every report.)

### KPI card labels
- `Posts Δ` → `TOTAL POSTS`
- `Views Δ` → `TOTAL VIEWS`
- `Engagements Δ` → `TOTAL ENGAGEMENTS`
- `Clicks Δ` → `TOTAL CLICKS`

Use exact formatted values (`fmt`, with thousands separators) on all four cards — no compact abbreviations — so `1,515,953` displays consistently with the report cards.

### Active range label
Replace the `Δ added from … → …` line with an explicit active-range pill above/below the KPI cards:

```
ALL REPORTS              (selectedRange = all)
LAST 7 DAYS              (7d)
LAST 30 DAYS             (30d)
LAST 60 DAYS             (60d)
LAST 120 DAYS            (120d)
LAST 1 YEAR              (1y)
LAST 2 YEARS             (2y)
```

Plus secondary text: `N reports · {earliest report_date} → {latest report_date}` derived from `filteredReports`.

### Report list
- Heading: `Reports ({filteredReports.length})` — already uses `filtered`, will now read from the renamed `filteredReports`.
- Cards continue to show exact values via `fmt(...)`.

### Chart
- `<ReportsTrendChart rows={filteredReports} />` and `<PlatformBreakdownChart rows={filteredReports} />` — already wired to the filtered set; just confirms they use the new collection.
- Click-through to `/reports/:slug` is unchanged.

### Files to edit
- `src/pages/reports/ReportsArchive.tsx` — all the logic changes above.

No DB, edge function, or RangeSelector changes required.

### Acceptance check after change
- Page loads with `ALL` selected.
- Summary cards, chart, and list all derived from `filteredReports`.
- Apr 28 report shows `1,515,953` in its card; the ALL summary sums all reports.
- Switching 7D/30D/etc. updates summary, chart, and list together.

### Answers to the three required confirmations
- **State/filter logic changed**: default range → `'all'`; replaced delta calculation with straight sum aggregation over a single `filteredReports` memo; renamed for clarity; updated KPI labels and added an active-range label.
- **Summary cards format**: exact totals with thousands separators (e.g. `1,515,953`), not abbreviated.
- **Default selected range**: `ALL`, confirmed.

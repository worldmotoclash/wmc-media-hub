## Fix: KPIs use period delta (Option 2)

The current KPI cards sum each report's cumulative totals across every day in the range, which inflates the numbers ~8–10×. Switch to **period delta**: the difference between the latest and earliest snapshot in the selected range — i.e. "added during this period".

### Changes

**`src/pages/reports/ReportsArchive.tsx`**
- Replace the `totals = filtered.reduce(...)` summing logic with delta logic:
  - Sort `filtered` ascending by `report_date`.
  - If 0 rows: zeros.
  - If 1 row: show that single snapshot's totals (no delta possible).
  - If 2+ rows: `last.total_X − first.total_X` for posts, views, engagements, clicks (clamped to ≥0 in case of mid-period resets).
- Add a small caption under the KPI grid: `Δ from 2026-04-04 → 2026-04-24 (21 reports)` — makes the delta interpretation explicit.

**`src/components/reports/PlatformBreakdownChart.tsx`**
- Same problem: it sums cumulative per-platform values across days.
- Fix: instead of summing every row, take only the **latest** report's `platforms` snapshot and the **earliest** report's `platforms` snapshot, then show per-platform delta (`latest − earliest` matched by platform name). If only one report in range, just show that snapshot.
- Update the card title to `Platform Breakdown (period delta)` for clarity.

**`src/components/reports/ReportsTrendChart.tsx`**
- No change. The line/area chart already plots each day's cumulative value over time, which correctly visualizes growth — no double counting happens here.

### Result for current 60D view (Apr 4 → Apr 24)
- Posts: 2,222 → **99** (160 latest − 61 earliest)
- Views: 11.1M → **~1.15M** (1.27M − 124K)
- Engagements: 590K → **~54.8K**
- Clicks: 312K → **~27.1K**

These match the actual growth shown in the trend chart.

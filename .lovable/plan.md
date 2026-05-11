# Racer Application Reports Dashboard

Upgrade `/racer/reports` from a simple card archive into a KPI dashboard modeled on `/reports`, summarizing racer-contact KPIs over time.

## Layout (matches `/reports`)

1. **Header** — "Racer Application Dashboard" + subtitle
2. **Range selector** — reuse existing `RangeSelector` component (`7d / 30d / 60d / 120d / 1y / 2y / all`)
3. **Active range chip + period info** — "N reports · from → to"
4. **KPI cards (latest snapshot in window)** — these are point-in-time totals, not sums:
   - Total Contacts
   - Complete Profiles
   - Readiness Started
   - Created Today (latest report's value)
   - Updated (latest report's value)
5. **Trend chart** — new `RacerReportsTrendChart` using recharts `ComposedChart`, click point → opens that day's report:
   - Area: Total Contacts (left axis)
   - Lines: Complete Profiles, Readiness Started (left axis)
   - Lines: Created Today, Updated, New vs Previous (right axis)
6. **Activity totals (sum across window)** — small secondary KPI strip:
   - Σ Created (sum of `created_today` across selected reports)
   - Σ Updated (sum of `updated_contacts`)
   - Σ Regressions (sum of `regressions`)
7. **Reports list** — one card per report with date + the six KPI metrics, links to `/racer/reports/:slug`

## Data

- Single query against existing `racer_contact_reports` table, ordered by `report_date desc`, limit 1000.
- Select: `id, slug, title, report_date, totals`.
- Filtering by range happens client-side (same pattern as `/reports`).
- KPI values come from the `totals` JSON: `total_contacts`, `created_today`, `new_vs_previous`, `updated_contacts`, `regressions`, `contact_profiles_complete`, `readiness_profiles_started`.

## Files

Edited:
- `src/pages/racer/reports/RacerContactReportsArchive.tsx` — replace current grid with dashboard layout.

New:
- `src/components/racer/reports/RacerReportsTrendChart.tsx` — KPI trend chart specific to racer KPIs (mirrors `ReportsTrendChart` styling, different metrics).

Reused:
- `@/components/reports/RangeSelector` (shared)
- shadcn `Card`, `Skeleton`
- recharts (already a dep)

## Out of scope

- No DB changes.
- No new ingest fields — KPIs come from what's already stored in `totals`.
- Detail page `/racer/reports/:slug` unchanged.
- Not adding the dashboard under `/reports` — kept as its own racer family.

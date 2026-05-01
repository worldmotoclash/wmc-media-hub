## Add Shares to Performance Trend Chart

The archive page already passes `total_shares` on each row, but `ReportsTrendChart` ignores it. The chart currently plots Views (area, left axis), Engagements (line, left axis), Clicks (line, right axis), and Posts (dashed line, right axis). Tooltip shows whatever series are present.

### Change

**File:** `src/components/reports/ReportsTrendChart.tsx`

1. Extend `TrendRow` interface with `total_shares?: number` (optional for back-compat).
2. In the data mapper, add `Shares: r.total_shares ?? 0`.
3. Add a new `<Line>` for `Shares` on the right Y axis, distinct color (use `hsl(var(--telemetry-warning))` if defined, otherwise a fixed accent like `#f59e0b` / amber, or reuse a Tailwind chart token already in the project — confirm available token before finalizing). Style: solid 2px line, no static dot, activeDot navigates to slug like the others.
4. Order in render (controls legend order): Views, Engagements, Clicks, Shares, Posts.

No other files need changes — `ReportsArchive` already provides `total_shares` on each row, and the existing `CustomTooltip` iterates `payload`, so Shares will appear automatically once the series is added.

### Visual notes
- Shares stays on the right Y axis alongside Clicks/Posts since its magnitude is much smaller than Views/Engagements.
- Legend label: "Shares".
- Tooltip will list all five metrics on hover.
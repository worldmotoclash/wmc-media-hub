## Goal

Transform `/reports` from a static archive list into an **interactive analytics dashboard** with:
1. A time-range selector (7d / 30d / 60d / 120d / 1y / 2y / All)
2. KPI summary cards aggregated for the selected range
3. Trend charts (totals over time + per-platform breakdown)
4. A cinematic **"Live Telemetry"** HUD-style streaming graph at the top — WMC brand identity, motorsport-broadcast feel
5. Existing report list filtered by the selected range, kept below

The per-report detail page (`/reports/:slug`) is unchanged.

---

## What the user will see on `/reports`

```text
┌──────────────────────────────────────────────────┐
│  ● LIVE        WMC LIVE TELEMETRY                │
│                                                  │
│   SPEED 184 MPH    RPM 12,450    THROTTLE 87%    │
│   ╱╲    ╱╲╱╲                                     │
│  ╱  ╲╱╲╱    ╲╱╲╱╲   (scrolling neon line)       │
│                                                  │
└──────────────────────────────────────────────────┘

Social Performance Reports
[ 7D ] [ 30D ] [ 60D ] [ 120D ] [ 1Y ] [ 2Y ] [ All ]

┌─Posts─┐ ┌─Views─┐ ┌─Engagements─┐ ┌─Clicks─┐
│ 1,204 │ │ 482K  │ │   38.2K     │ │ 9.1K   │
└───────┘ └───────┘ └─────────────┘ └────────┘

[ Trend over time — area/line chart, all 4 metrics ]

[ Per-platform stacked bar chart — posts/views by platform ]

[ Reports archive list — filtered to range ]
```

---

## Implementation

### 1. Design tokens (`src/index.css`)
Add HUD/telemetry semantic tokens (HSL, dark-only feel, used regardless of theme):
- `--telemetry-bg: 0 0% 4%`
- `--telemetry-grid: 0 0% 14%`
- `--telemetry-primary: 22 100% 50%` (electric orange #FF6B00)
- `--telemetry-accent: 195 100% 50%` (cyan #00BFFF)
- `--telemetry-danger: 0 84% 55%`
- `--telemetry-text: 0 0% 92%`
- `--telemetry-muted: 0 0% 55%`

Add utility classes:
- `.hud-frame` — black bg, thin orange border, corner brackets via `::before`/`::after` pseudo-elements
- `.hud-glow` — `filter: drop-shadow(0 0 6px hsl(var(--telemetry-primary)))`
- `.hud-scanline` — subtle repeating linear gradient overlay (CRT feel)
- `.font-mono-hud` — mapped to `JetBrains Mono` (loaded via Google Fonts `@import`)
- Keyframes: `pulse-live` (red dot), `flicker` (subtle opacity jitter)

### 2. New component: `src/components/reports/LiveTelemetry.tsx`
- Self-contained card with HUD frame
- State: `points: { t: number; speed: number; rpm: number; throttle: number }[]` — sliding window of 60 points
- `setInterval(150ms)` pushes a new synthetic point (smoothed random walk so the lines look organic, not jittery)
- Animated numeric readouts (count-up easing via `framer-motion`'s `animate` on a `useMotionValue`)
- Recharts `LineChart` with three `Line` series, `isAnimationActive={false}` (we manually animate via state updates), neon stroke + drop-shadow filter
- Top-right: pulsing red dot + "LIVE" label
- Pauses interval when tab is hidden (`document.visibilityState`) to save CPU
- Pure visual flourish — does **not** read from the database

### 3. New component: `src/components/reports/RangeSelector.tsx`
Segmented control of buttons: `7d, 30d, 60d, 120d, 1y, 2y, all`. Emits a `Range` value. Uses existing `Button` (variant outline / default for active).

### 4. New component: `src/components/reports/ReportsTrendChart.tsx`
- Recharts `ComposedChart` (area for views, lines for engagements/clicks/posts on a secondary axis)
- Receives the filtered `ReportRow[]` and renders by `report_date`
- Tooltip styled with shadcn `Card`

### 5. New component: `src/components/reports/PlatformBreakdownChart.tsx`
- Aggregates `platforms[]` JSON across the filtered rows (sum `views` / `engagements` per platform)
- Recharts horizontal `BarChart`
- Falls back to a friendly empty state when no platform data is present

### 6. Refactor `src/pages/reports/ReportsArchive.tsx`
- Add `range` state (default `30d`)
- Compute `cutoff = today - rangeDays` (or null for "all"), filter `rows` by `report_date >= cutoff`
- Compute aggregate KPIs from the filtered rows (sum of totals)
- Layout order:
  1. `<LiveTelemetry />`
  2. Page header
  3. `<RangeSelector />`
  4. KPI cards (re-use existing `Metric`/`Card` style, larger numbers)
  5. `<ReportsTrendChart />`
  6. `<PlatformBreakdownChart />`
  7. Existing report cards list (unchanged structure, filtered)
- Query unchanged but also pull `platforms` jsonb (lightweight — already capped to 200 rows)

### 7. Tailwind config (`tailwind.config.ts`)
- Register the telemetry color tokens under `colors.telemetry.{bg,grid,primary,accent,danger,text,muted}` so charts/components can use semantic class names like `text-telemetry-primary`
- Add `pulse-live` and `flicker` keyframes/animations
- Add `fontFamily.mono-hud: ['"JetBrains Mono"', 'monospace']`

### 8. Font loading (`src/index.css`)
Add JetBrains Mono `@import` next to existing Inter import.

---

## Files touched

**New**
- `src/components/reports/LiveTelemetry.tsx`
- `src/components/reports/RangeSelector.tsx`
- `src/components/reports/ReportsTrendChart.tsx`
- `src/components/reports/PlatformBreakdownChart.tsx`

**Edited**
- `src/pages/reports/ReportsArchive.tsx`
- `src/index.css` (tokens, font, HUD utilities, keyframes)
- `tailwind.config.ts` (telemetry colors, animations, mono-hud font)

No DB changes, no new dependencies (recharts + framer-motion already installed).

---

## Notes / decisions

- Telemetry component uses **synthetic data** by design — it's a brand/atmosphere flourish, not a real metric. The actual social data lives in the trend chart below.
- Range selector defaults to **30 days** (most common analytics window).
- Mobile: range buttons wrap; charts use `ResponsiveContainer`; HUD frame keeps padding scaled down on `< sm`.
- Performance: telemetry interval pauses on tab blur; sliding window capped at 60 points; charts memoize aggregation with `useMemo`.

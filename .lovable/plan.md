## Goal

1. Remove the `LiveTelemetry` HUD from `/reports` so the archive stays focused on social analytics.
2. Build a new standalone demo page at `/racer-performance` that showcases a multi-channel racer telemetry dashboard with racer + track selection and 1‑vs‑1 / 1‑vs‑field comparison.

This is a **front-end demo** — all data is synthetic (mock racers, tracks, lap streams). No DB schema changes.

---

## Changes to `/reports`

- `src/pages/reports/ReportsArchive.tsx`: remove `<LiveTelemetry />` and its import. Add a small subtle link/button in the header: "View Racer Telemetry Demo →" pointing to `/racer-performance`.
- `src/components/reports/LiveTelemetry.tsx`: keep the file (it will be reused as a building block on the new page) — no deletion.

---

## New page: `/racer-performance`

### Route
- Add to `src/App.tsx`: `<Route path="/racer-performance" element={<RacerPerformance />} />` (public, same as `/reports`).

### Page file
- `src/pages/racer-performance/RacerPerformance.tsx`

### Layout (top → bottom)

```text
┌───────────────────────────────────────────────────────────────┐
│ HEADER: "RACER PERFORMANCE — LIVE TELEMETRY DEMO"             │
│ Subtitle + LIVE pulse dot                                     │
├───────────────────────────────────────────────────────────────┤
│ SELECTORS BAR                                                 │
│  [ Racer A ▾ ]   [ Racer B / Field ▾ ]   [ Track ▾ ]          │
│  [ Session: Practice / Qualy / Race ▾ ]   [ Lap ▾ ]           │
├───────────────────────────────────────────────────────────────┤
│ HUD STAT TILES (animated readouts)                            │
│  SPEED · RPM · THROTTLE · BRAKE · LEAN ANGLE · G‑FORCE        │
│  GEAR · TIRE TEMP · LAP TIME · DELTA Δ                        │
├───────────────────────────────────────────────────────────────┤
│ MAIN TELEMETRY CHART (multi-line, scrolling window)           │
│  Channel toggles: Speed | Throttle | Brake | Lean | G | RPM    │
│  Racer A solid neon orange · Racer B dashed cyan              │
├───────────────────────────────────────────────────────────────┤
│ COMPARISON STRIP                                              │
│  - Lap-time delta sparkline                                   │
│  - Sector bars (S1/S2/S3) with green/red faster/slower        │
│  - Mini track map placeholder (SVG outline) with A/B dots     │
└───────────────────────────────────────────────────────────────┘
```

### Components to create (under `src/components/racer-performance/`)

1. `RacerSelector.tsx` — two dropdowns (Racer A, Racer B|Field) populated from a mock racer list.
2. `TrackSelector.tsx` — track + session + lap dropdowns.
3. `TelemetryHUD.tsx` — grid of `Readout` tiles for Speed, RPM, Throttle, Brake, Lean Angle, Lateral G, Longitudinal G, Gear, Tire Temp (FL/FR/RL/RR rolled up), Lap Time, Delta. Reuses the animated number hook pattern from `LiveTelemetry`.
4. `TelemetryChart.tsx` — Recharts `LineChart` with a sliding-window data buffer; supports two series per channel (Racer A / Racer B). Channel-toggle chips above the chart.
5. `LapDeltaStrip.tsx` — small composed chart showing cumulative delta vs reference (Racer B or field median).
6. `SectorBars.tsx` — three colored bars (S1/S2/S3) showing time delta per sector.
7. `TrackMapMini.tsx` — inline SVG oval/track silhouette with two animated dots representing each racer's position around the lap.

### Mock data layer

- `src/components/racer-performance/mockTelemetry.ts`
  - `RACERS`: ~6 entries (id, name, number, team, color).
  - `TRACKS`: 3–4 entries (id, name, length_km, sector_split).
  - `generateStream(racerId, trackId, channels[])`: returns a `setInterval`-driven generator producing correlated channel values (e.g. brake↑ → speed↓ → lean↓; throttle↑ → speed↑; lateral G derived from speed × lean).
  - `FIELD` pseudo-racer (id `"field"`) returned as median of all racers.

### Channel ranges (for synthetic generation)

- Speed: 40–340 km/h
- RPM: 4 000–16 500
- Throttle: 0–100 %
- Brake: 0–100 %
- Lean Angle: -62°..+62°
- Lateral G: -2.4..+2.4
- Longitudinal G: -1.8..+1.6
- Gear: 1–6
- Tire Temp: 60–115 °C

All use a bounded random-walk similar to `LiveTelemetry`'s `nextValue`, with cross-channel coupling for realism.

### Comparison logic

- Selector for "Compare against": `Racer B` | `Field median` | `None`.
- When set, every chart and HUD tile shows a secondary value/series and a Δ badge (green if A faster/better, red if slower).
- Sector bars and lap-delta strip are hidden when "None".

### Styling

- Reuse existing telemetry tokens already in `src/index.css`: `--telemetry-primary/accent/secondary/grid/muted/danger`, `hud-frame`, `hud-corner-*`, `hud-scanline`, `animate-hud-flicker`, `animate-pulse-live`, `font-hud-display`, `font-hud-mono`, `hud-glow-*`.
- Add one extra accent token only if needed (e.g. `--telemetry-compare` cyan) — likely the existing accent works.

---

## Discoverability

- Add a small card/link from `/reports` header → `/racer-performance` ("Demo: Racer Telemetry").
- No nav menu change required (keeps it as an unlisted demo).

---

## Out of scope (explicitly)

- No Supabase tables, no real racer/track data wiring, no live ingest.
- No persistence of selections (URL params only if trivial).
- No mobile-optimized track map — desktop-first demo.

---

## Files touched

**New**
- `src/pages/racer-performance/RacerPerformance.tsx`
- `src/components/racer-performance/RacerSelector.tsx`
- `src/components/racer-performance/TrackSelector.tsx`
- `src/components/racer-performance/TelemetryHUD.tsx`
- `src/components/racer-performance/TelemetryChart.tsx`
- `src/components/racer-performance/LapDeltaStrip.tsx`
- `src/components/racer-performance/SectorBars.tsx`
- `src/components/racer-performance/TrackMapMini.tsx`
- `src/components/racer-performance/mockTelemetry.ts`

**Modified**
- `src/App.tsx` — register `/racer-performance` route.
- `src/pages/reports/ReportsArchive.tsx` — remove `LiveTelemetry`, add link to demo.

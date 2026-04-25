## Remove the white hover background on Platform Breakdown chart

The light-gray block behind the bars on hover is Recharts' default `Tooltip` cursor for `BarChart`. Replace it with a subtle, on-brand highlight.

### Change

**`src/components/reports/PlatformBreakdownChart.tsx`** — add a `cursor` prop to the `<Tooltip>`:

```tsx
<Tooltip
  cursor={{ fill: "hsl(var(--telemetry-primary) / 0.08)" }}
  contentStyle={{ ... }}
  formatter={...}
/>
```

This swaps the opaque white/gray block for a faint orange tint that matches the HUD palette. Setting `cursor={false}` would also work if you'd rather have no highlight at all — happy to do that variant instead. Defaulting to the subtle tint as it still gives a hover affordance.

No other files affected.

interface Props {
  sectorsA: [number, number, number]; // seconds
  sectorsB?: [number, number, number];
}

export default function SectorBars({ sectorsA, sectorsB }: Props) {
  return (
    <div className="hud-frame rounded-sm p-4">
      <div className="font-hud-mono text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--telemetry-muted))] mb-3">
        Sector Comparison
      </div>
      <div className="grid grid-cols-3 gap-3">
        {sectorsA.map((sa, i) => {
          const sb = sectorsB?.[i];
          const delta = sb !== undefined ? sa - sb : null;
          const faster = delta !== null && delta < 0;
          const color =
            delta === null
              ? "hsl(var(--telemetry-primary))"
              : faster
              ? "hsl(120 80% 55%)"
              : "hsl(0 85% 60%)";
          return (
            <div key={i} className="border border-[hsl(var(--telemetry-grid))] rounded-sm p-3">
              <div className="font-hud-mono text-[9px] uppercase tracking-widest text-[hsl(var(--telemetry-muted))]">
                Sector {i + 1}
              </div>
              <div
                className="font-hud-display text-2xl mt-1"
                style={{ color, textShadow: `0 0 6px ${color} / 0.5` }}
              >
                {sa.toFixed(3)}s
              </div>
              {delta !== null && (
                <div className="font-hud-mono text-[11px] mt-0.5" style={{ color }}>
                  {delta > 0 ? "+" : ""}
                  {delta.toFixed(3)}
                </div>
              )}
              <div className="mt-2 h-1 rounded-full bg-[hsl(var(--telemetry-grid))] overflow-hidden">
                <div
                  className="h-full"
                  style={{
                    width: `${Math.min(100, (sa / 35) * 100)}%`,
                    backgroundColor: color,
                    boxShadow: `0 0 6px ${color}`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

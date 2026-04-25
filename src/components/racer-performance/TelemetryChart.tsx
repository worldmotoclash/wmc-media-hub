import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { CHANNELS, type ChannelKey, type TelemetryFrame } from "./mockTelemetry";

interface Props {
  framesA: TelemetryFrame[];
  framesB?: TelemetryFrame[];
  racerAName: string;
  racerBName?: string;
}

export default function TelemetryChart({ framesA, framesB, racerAName, racerBName }: Props) {
  const [active, setActive] = useState<ChannelKey>("speed");
  const channel = CHANNELS.find((c) => c.key === active)!;

  // Merge by index (both streams tick in lockstep)
  const data = framesA.map((fa, i) => {
    const fb = framesB?.[i];
    return {
      t: fa.t,
      A: fa[active],
      B: fb ? fb[active] : undefined,
    };
  });

  return (
    <div className="hud-frame hud-scanline rounded-sm p-4 md:p-5 overflow-hidden">
      <span className="hud-corner-bl" aria-hidden />
      <span className="hud-corner-br" aria-hidden />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="font-hud-display text-[hsl(var(--telemetry-primary))] text-xl tracking-wider">
          CHANNEL · {channel.label.toUpperCase()} <span className="text-[hsl(var(--telemetry-muted))] text-sm">{channel.unit}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CHANNELS.map((c) => (
            <button
              key={c.key}
              onClick={() => setActive(c.key)}
              className={`font-hud-mono text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-sm border transition-colors ${
                active === c.key
                  ? "border-[hsl(var(--telemetry-primary))] text-[hsl(var(--telemetry-primary))] bg-[hsl(var(--telemetry-primary)/0.1)]"
                  : "border-[hsl(var(--telemetry-grid))] text-[hsl(var(--telemetry-muted))] hover:text-[hsl(var(--telemetry-accent))]"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4 mb-2 font-hud-mono text-[10px] uppercase tracking-widest">
        <LegendDot color="var(--telemetry-primary)" label={racerAName} solid />
        {racerBName && <LegendDot color="var(--telemetry-accent)" label={racerBName} />}
      </div>

      <div className="h-64 md:h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--telemetry-grid))" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="t" hide />
            <YAxis
              domain={channel.domain}
              tick={{ fill: "hsl(var(--telemetry-muted))", fontSize: 10, fontFamily: "JetBrains Mono" }}
              axisLine={{ stroke: "hsl(var(--telemetry-grid))" }}
              tickLine={false}
              width={36}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--background))",
                border: "1px solid hsl(var(--telemetry-grid))",
                fontFamily: "JetBrains Mono",
                fontSize: 11,
              }}
              labelFormatter={() => ""}
              formatter={(v: number) => [v.toFixed(1), ""]}
            />
            <Line
              type="monotone"
              dataKey="A"
              name={racerAName}
              stroke="hsl(var(--telemetry-primary))"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              style={{ filter: "drop-shadow(0 0 4px hsl(var(--telemetry-primary) / 0.85))" }}
            />
            {framesB && (
              <Line
                type="monotone"
                dataKey="B"
                name={racerBName}
                stroke="hsl(var(--telemetry-accent))"
                strokeWidth={1.75}
                strokeDasharray="4 3"
                dot={false}
                isAnimationActive={false}
                style={{ filter: "drop-shadow(0 0 3px hsl(var(--telemetry-accent) / 0.7))" }}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LegendDot({ color, label, solid }: { color: string; label: string; solid?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[hsl(var(--telemetry-muted))]">
      <span
        className="inline-block w-4 h-0.5"
        style={{
          background: solid ? `hsl(${color})` : `repeating-linear-gradient(90deg, hsl(${color}) 0 4px, transparent 4px 7px)`,
          boxShadow: `0 0 4px hsl(${color} / 0.8)`,
        }}
      />
      <span style={{ color: `hsl(${color})` }}>{label}</span>
    </span>
  );
}

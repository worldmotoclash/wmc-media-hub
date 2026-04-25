import { useEffect, useRef, useState } from "react";
import type { TelemetryFrame } from "./mockTelemetry";

interface Props {
  a: TelemetryFrame;
  b?: TelemetryFrame;
  lapTimeA: number; // seconds
  lapTimeB?: number;
}

function useAnimatedNumber(target: number, duration = 220) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    fromRef.current = value;
    startRef.current = null;
    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const p = Math.min(1, (ts - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(fromRef.current + (target - fromRef.current) * eased);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

const formatLap = (s: number) => {
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${rest.toFixed(3).padStart(6, "0")}`;
};

export default function TelemetryHUD({ a, b, lapTimeA, lapTimeB }: Props) {
  const speed = useAnimatedNumber(a.speed);
  const rpm = useAnimatedNumber(a.rpm);
  const throttle = useAnimatedNumber(a.throttle);
  const brake = useAnimatedNumber(a.brake);
  const lean = useAnimatedNumber(a.lean);
  const gLat = useAnimatedNumber(a.gLat);
  const gLong = useAnimatedNumber(a.gLong);
  const tire = useAnimatedNumber(a.tireTemp);

  const delta = lapTimeB !== undefined ? lapTimeA - lapTimeB : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <Tile label="Speed" unit="km/h" value={speed.toFixed(0)} compare={b?.speed.toFixed(0)} tone="primary" />
      <Tile label="RPM" unit="" value={Math.round(rpm).toLocaleString()} compare={b ? Math.round(b.rpm).toLocaleString() : undefined} tone="accent" />
      <Tile label="Gear" unit="" value={String(a.gear)} compare={b ? String(b.gear) : undefined} tone="secondary" />
      <Tile label="Throttle" unit="%" value={throttle.toFixed(0)} compare={b?.throttle.toFixed(0)} tone="primary" bar={throttle} />
      <Tile label="Brake" unit="%" value={brake.toFixed(0)} compare={b?.brake.toFixed(0)} tone="danger" bar={brake} />
      <Tile label="Lean" unit="°" value={lean.toFixed(1)} compare={b?.lean.toFixed(1)} tone="accent" />
      <Tile label="G-Lat" unit="G" value={gLat.toFixed(2)} compare={b?.gLat.toFixed(2)} tone="primary" />
      <Tile label="G-Long" unit="G" value={gLong.toFixed(2)} compare={b?.gLong.toFixed(2)} tone="secondary" />
      <Tile label="Tire" unit="°C" value={tire.toFixed(0)} compare={b?.tireTemp.toFixed(0)} tone="danger" />
      <Tile
        label="Lap"
        unit=""
        value={formatLap(lapTimeA)}
        compare={lapTimeB !== undefined ? formatLap(lapTimeB) : undefined}
        tone="accent"
        delta={delta}
      />
    </div>
  );
}

function Tile({
  label,
  unit,
  value,
  compare,
  tone,
  bar,
  delta,
}: {
  label: string;
  unit: string;
  value: string;
  compare?: string;
  tone: "primary" | "accent" | "secondary" | "danger";
  bar?: number;
  delta?: number | null;
}) {
  const colorVar =
    tone === "primary"
      ? "var(--telemetry-primary)"
      : tone === "accent"
      ? "var(--telemetry-accent)"
      : tone === "danger"
      ? "var(--telemetry-danger)"
      : "var(--telemetry-secondary)";

  return (
    <div className="hud-frame rounded-sm p-3 relative overflow-hidden">
      <span className="hud-corner-bl" aria-hidden />
      <div
        className="font-hud-mono text-[9px] uppercase tracking-[0.25em] text-[hsl(var(--telemetry-muted))]"
      >
        {label}
      </div>
      <div className="flex items-baseline gap-1 mt-1">
        <span
          className="font-hud-display text-2xl md:text-3xl leading-none"
          style={{ color: `hsl(${colorVar})`, textShadow: `0 0 8px hsl(${colorVar} / 0.6)` }}
        >
          {value}
        </span>
        {unit && (
          <span className="font-hud-mono text-[10px] text-[hsl(var(--telemetry-muted))]">
            {unit}
          </span>
        )}
      </div>
      {compare !== undefined && (
        <div className="font-hud-mono text-[10px] text-[hsl(var(--telemetry-muted))] mt-0.5">
          vs <span className="text-[hsl(var(--telemetry-accent))]">{compare}</span>
          {unit && <span className="opacity-60"> {unit}</span>}
        </div>
      )}
      {bar !== undefined && (
        <div className="mt-2 h-1 rounded-full bg-[hsl(var(--telemetry-grid))] overflow-hidden">
          <div
            className="h-full"
            style={{
              width: `${bar}%`,
              backgroundColor: `hsl(${colorVar})`,
              boxShadow: `0 0 6px hsl(${colorVar} / 0.8)`,
            }}
          />
        </div>
      )}
      {delta !== null && delta !== undefined && (
        <div
          className="font-hud-mono text-[10px] mt-1"
          style={{
            color: delta < 0 ? "hsl(120 80% 55%)" : "hsl(0 85% 60%)",
          }}
        >
          {delta > 0 ? "+" : ""}
          {delta.toFixed(3)}s
        </div>
      )}
    </div>
  );
}

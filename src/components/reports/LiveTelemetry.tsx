import { useEffect, useRef, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface Point {
  t: number;
  speed: number;
  rpm: number;
  throttle: number;
}

const WINDOW = 60;
const TICK_MS = 160;

// Smooth-ish bounded random walk
function nextValue(prev: number, min: number, max: number, volatility: number) {
  const drift = (Math.random() - 0.5) * volatility;
  const next = prev + drift;
  if (next < min) return min + (min - next) * 0.5;
  if (next > max) return max - (next - max) * 0.5;
  return next;
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
      const elapsed = ts - startRef.current;
      const p = Math.min(1, elapsed / duration);
      // easeOutCubic
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

export default function LiveTelemetry() {
  const [points, setPoints] = useState<Point[]>(() => {
    const seed: Point[] = [];
    let speed = 140, rpm = 9500, throttle = 70;
    for (let i = 0; i < WINDOW; i++) {
      speed = nextValue(speed, 60, 215, 14);
      rpm = nextValue(rpm, 4000, 14500, 600);
      throttle = nextValue(throttle, 10, 100, 12);
      seed.push({ t: Date.now() - (WINDOW - i) * TICK_MS, speed, rpm, throttle });
    }
    return seed;
  });

  useEffect(() => {
    let timer: number | null = null;
    const start = () => {
      if (timer != null) return;
      timer = window.setInterval(() => {
        setPoints((prev) => {
          const last = prev[prev.length - 1];
          const next: Point = {
            t: Date.now(),
            speed: nextValue(last.speed, 60, 215, 14),
            rpm: nextValue(last.rpm, 4000, 14500, 600),
            throttle: nextValue(last.throttle, 10, 100, 12),
          };
          const out = prev.length >= WINDOW ? prev.slice(1) : prev.slice();
          out.push(next);
          return out;
        });
      }, TICK_MS);
    };
    const stop = () => {
      if (timer != null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const onVis = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const current = points[points.length - 1];
  const aSpeed = useAnimatedNumber(current.speed);
  const aRpm = useAnimatedNumber(current.rpm);
  const aThrottle = useAnimatedNumber(current.throttle);

  return (
    <div className="hud-frame hud-scanline animate-hud-flicker rounded-sm p-5 md:p-6 mb-10 overflow-hidden">
      <span className="hud-corner-bl" aria-hidden />
      <span className="hud-corner-br" aria-hidden />

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-baseline gap-3">
          <span className="font-hud-display text-[hsl(var(--telemetry-primary))] text-2xl md:text-3xl hud-glow-primary">
            WMC LIVE TELEMETRY
          </span>
          <span className="font-hud-mono text-xs text-[hsl(var(--telemetry-muted))] hidden sm:inline">
            CH-01 · 1000Hz · STREAMING
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[hsl(var(--telemetry-danger))] animate-pulse-live" />
          <span className="font-hud-display text-[hsl(var(--telemetry-danger))] text-sm tracking-widest">
            LIVE
          </span>
        </div>
      </div>

      {/* Numeric readouts */}
      <div className="grid grid-cols-3 gap-3 md:gap-6 mb-5">
        <Readout label="SPEED" unit="MPH" value={aSpeed.toFixed(0)} tone="primary" />
        <Readout label="RPM" unit="" value={Math.round(aRpm).toLocaleString()} tone="accent" />
        <Readout label="THROTTLE" unit="%" value={aThrottle.toFixed(0)} tone="secondary" />
      </div>

      {/* Graph */}
      <div className="h-44 md:h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="hsl(var(--telemetry-grid))" strokeDasharray="2 4" vertical={false} />
            <XAxis dataKey="t" hide />
            <YAxis
              yAxisId="speed"
              domain={[0, 220]}
              tick={{ fill: "hsl(var(--telemetry-muted))", fontSize: 10, fontFamily: "JetBrains Mono" }}
              axisLine={{ stroke: "hsl(var(--telemetry-grid))" }}
              tickLine={false}
              width={28}
            />
            <YAxis yAxisId="rpm" domain={[0, 15000]} hide />
            <YAxis yAxisId="throttle" domain={[0, 100]} hide />
            <Line
              yAxisId="speed"
              type="monotone"
              dataKey="speed"
              stroke="hsl(var(--telemetry-primary))"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              style={{ filter: "drop-shadow(0 0 4px hsl(var(--telemetry-primary) / 0.85))" }}
            />
            <Line
              yAxisId="rpm"
              type="monotone"
              dataKey="rpm"
              stroke="hsl(var(--telemetry-accent))"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              style={{ filter: "drop-shadow(0 0 3px hsl(var(--telemetry-accent) / 0.7))" }}
            />
            <Line
              yAxisId="throttle"
              type="monotone"
              dataKey="throttle"
              stroke="hsl(var(--telemetry-secondary))"
              strokeWidth={1}
              strokeDasharray="3 3"
              dot={false}
              isAnimationActive={false}
              opacity={0.7}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer status line */}
      <div className="mt-3 flex items-center justify-between font-hud-mono text-[10px] text-[hsl(var(--telemetry-muted))] uppercase tracking-widest">
        <span>SYS · NOMINAL</span>
        <span className="hidden md:inline">SAMPLE {points.length}/{WINDOW}</span>
        <span>{new Date(current.t).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

function Readout({
  label,
  unit,
  value,
  tone,
}: {
  label: string;
  unit: string;
  value: string;
  tone: "primary" | "accent" | "secondary";
}) {
  const colorClass =
    tone === "primary"
      ? "text-[hsl(var(--telemetry-primary))] hud-glow-primary"
      : tone === "accent"
      ? "text-[hsl(var(--telemetry-accent))] hud-glow-accent"
      : "text-[hsl(var(--telemetry-secondary))]";
  return (
    <div className="border-l-2 border-[hsl(var(--telemetry-primary)/0.5)] pl-3">
      <div className="font-hud-mono text-[10px] uppercase tracking-[0.2em] text-[hsl(var(--telemetry-muted))]">
        {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`font-hud-display text-3xl md:text-5xl leading-none ${colorClass}`}>
          {value}
        </span>
        {unit && (
          <span className="font-hud-mono text-xs text-[hsl(var(--telemetry-muted))]">{unit}</span>
        )}
      </div>
    </div>
  );
}

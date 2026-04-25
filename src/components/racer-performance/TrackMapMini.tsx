interface Props {
  posA: number; // 0..1
  posB?: number;
  trackName: string;
}

// Stylized closed loop using a Bezier-ish path
const PATH = "M 60 140 C 60 60, 180 40, 260 80 C 340 120, 380 60, 440 100 C 510 145, 470 220, 380 230 C 280 240, 200 200, 130 220 C 70 235, 60 200, 60 140 Z";
const PATH_LENGTH_HINT = 1100; // approximate, only used for marker placement via getPointAtLength

import { useEffect, useRef, useState } from "react";

function usePointOnPath(t: number) {
  const ref = useRef<SVGPathElement>(null);
  const [pt, setPt] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const len = ref.current.getTotalLength();
    const p = ref.current.getPointAtLength(t * len);
    setPt({ x: p.x, y: p.y });
  }, [t]);
  return { ref, pt };
}

export default function TrackMapMini({ posA, posB, trackName }: Props) {
  const a = usePointOnPath(posA);
  const b = usePointOnPath(posB ?? 0);

  return (
    <div className="hud-frame rounded-sm p-4 h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="font-hud-mono text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--telemetry-muted))]">
          Track Map
        </div>
        <div className="font-hud-display text-sm text-[hsl(var(--telemetry-primary))] tracking-wider">
          {trackName.toUpperCase()}
        </div>
      </div>
      <svg viewBox="0 0 540 280" className="w-full h-48 md:h-56">
        <defs>
          <filter id="glow-a">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* track */}
        <path
          ref={a.ref}
          d={PATH}
          fill="none"
          stroke="hsl(var(--telemetry-grid))"
          strokeWidth={14}
          strokeLinejoin="round"
        />
        <path
          d={PATH}
          fill="none"
          stroke="hsl(var(--telemetry-primary) / 0.4)"
          strokeWidth={1.5}
          strokeDasharray="4 6"
        />
        {/* hidden duplicate for B's measurement */}
        <path ref={b.ref} d={PATH} fill="none" stroke="transparent" />

        {/* Racer A dot */}
        <circle
          cx={a.pt.x}
          cy={a.pt.y}
          r={7}
          fill="hsl(var(--telemetry-primary))"
          filter="url(#glow-a)"
        />
        {posB !== undefined && (
          <circle
            cx={b.pt.x}
            cy={b.pt.y}
            r={6}
            fill="hsl(var(--telemetry-accent))"
            filter="url(#glow-a)"
          />
        )}
      </svg>
    </div>
  );
}

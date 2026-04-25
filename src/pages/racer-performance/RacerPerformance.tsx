import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  RACERS,
  FIELD,
  TRACKS,
  makeInitialFrame,
  nextFrame,
  type Session,
  type TelemetryFrame,
} from "@/components/racer-performance/mockTelemetry";
import RacerSelector from "@/components/racer-performance/RacerSelector";
import TrackSelector from "@/components/racer-performance/TrackSelector";
import TelemetryHUD from "@/components/racer-performance/TelemetryHUD";
import TelemetryChart from "@/components/racer-performance/TelemetryChart";
import SectorBars from "@/components/racer-performance/SectorBars";
import TrackMapMini from "@/components/racer-performance/TrackMapMini";

const WINDOW = 80;
const TICK_MS = 160;

function seededLap(racerId: string, trackId: string, lap: number, base = 92): number {
  let h = 0;
  const k = `${racerId}:${trackId}:${lap}`;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
  return base + ((h % 4000) / 1000); // 92.000 .. 95.999
}

function seededSectors(racerId: string, trackId: string, lap: number): [number, number, number] {
  const total = seededLap(racerId, trackId, lap);
  const splits = TRACKS.find((t) => t.id === trackId)?.sectorSplit ?? [0.33, 0.34, 0.33];
  return [total * splits[0], total * splits[1], total * splits[2]];
}

export default function RacerPerformance() {
  const [racerA, setRacerA] = useState(RACERS[0].id);
  const [racerB, setRacerB] = useState(RACERS[1].id);
  const [trackId, setTrackId] = useState(TRACKS[0].id);
  const [session, setSession] = useState<Session>("Race");
  const [lap, setLap] = useState(8);

  const racerAObj = RACERS.find((r) => r.id === racerA)!;
  const racerBObj = racerB === FIELD.id ? FIELD : RACERS.find((r) => r.id === racerB)!;
  const trackObj = TRACKS.find((t) => t.id === trackId)!;

  const [framesA, setFramesA] = useState<TelemetryFrame[]>(() =>
    Array.from({ length: WINDOW }, () => makeInitialFrame(racerA))
  );
  const [framesB, setFramesB] = useState<TelemetryFrame[]>(() =>
    Array.from({ length: WINDOW }, () => makeInitialFrame(racerB))
  );

  // Reset stream on selector change
  const aRef = useRef(racerA);
  const bRef = useRef(racerB);
  useEffect(() => {
    aRef.current = racerA;
    setFramesA(Array.from({ length: WINDOW }, () => makeInitialFrame(racerA)));
  }, [racerA]);
  useEffect(() => {
    bRef.current = racerB;
    setFramesB(Array.from({ length: WINDOW }, () => makeInitialFrame(racerB)));
  }, [racerB]);

  useEffect(() => {
    let timer: number | null = null;
    const start = () => {
      if (timer != null) return;
      timer = window.setInterval(() => {
        setFramesA((prev) => {
          const next = nextFrame(prev[prev.length - 1], aRef.current);
          const out = prev.length >= WINDOW ? prev.slice(1) : prev.slice();
          out.push(next);
          return out;
        });
        setFramesB((prev) => {
          const next = nextFrame(prev[prev.length - 1], bRef.current);
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

  useEffect(() => {
    document.title = "Racer Performance — Live Telemetry Demo · WMC";
  }, []);

  const lapTimeA = useMemo(() => seededLap(racerA, trackId, lap), [racerA, trackId, lap]);
  const lapTimeB = useMemo(() => seededLap(racerB, trackId, lap), [racerB, trackId, lap]);
  const sectorsA = useMemo(() => seededSectors(racerA, trackId, lap), [racerA, trackId, lap]);
  const sectorsB = useMemo(() => seededSectors(racerB, trackId, lap), [racerB, trackId, lap]);

  const currentA = framesA[framesA.length - 1];
  const currentB = framesB[framesB.length - 1];

  return (
    <main className="container mx-auto px-4 py-10 max-w-7xl">
      {/* Header */}
      <header className="hud-frame hud-scanline animate-hud-flicker rounded-sm p-5 md:p-6 mb-6 overflow-hidden">
        <span className="hud-corner-bl" aria-hidden />
        <span className="hud-corner-br" aria-hidden />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="font-hud-mono text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--telemetry-muted))]">
              WMC Demo · Synthetic Data
            </div>
            <h1 className="font-hud-display text-3xl md:text-5xl text-[hsl(var(--telemetry-primary))] hud-glow-primary tracking-wider">
              RACER PERFORMANCE
            </h1>
            <p className="font-hud-mono text-xs text-[hsl(var(--telemetry-muted))] mt-1">
              {trackObj.name.toUpperCase()} · {session.toUpperCase()} · LAP {lap}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[hsl(var(--telemetry-danger))] animate-pulse-live" />
              <span className="font-hud-display text-sm tracking-widest text-[hsl(var(--telemetry-danger))]">
                LIVE
              </span>
            </div>
            <Link
              to="/reports"
              className="font-hud-mono text-[10px] uppercase tracking-widest text-[hsl(var(--telemetry-muted))] hover:text-[hsl(var(--telemetry-accent))] border border-[hsl(var(--telemetry-grid))] px-3 py-1.5 rounded-sm"
            >
              ← Reports
            </Link>
          </div>
        </div>
      </header>

      {/* Selectors */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="hud-frame rounded-sm p-4">
          <RacerSelector
            racerA={racerA}
            racerB={racerB}
            onChangeA={setRacerA}
            onChangeB={setRacerB}
          />
        </div>
        <div className="hud-frame rounded-sm p-4">
          <TrackSelector
            trackId={trackId}
            session={session}
            lap={lap}
            onChangeTrack={setTrackId}
            onChangeSession={setSession}
            onChangeLap={setLap}
          />
        </div>
      </section>

      {/* HUD tiles */}
      <section className="mb-6">
        <TelemetryHUD a={currentA} b={currentB} lapTimeA={lapTimeA} lapTimeB={lapTimeB} />
      </section>

      {/* Main chart */}
      <section className="mb-6">
        <TelemetryChart
          framesA={framesA}
          framesB={framesB}
          racerAName={`#${racerAObj.number} ${racerAObj.name}`}
          racerBName={racerBObj.id === "field" ? "Field Median" : `#${racerBObj.number} ${racerBObj.name}`}
        />
      </section>

      {/* Bottom strip */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
        <SectorBars sectorsA={sectorsA} sectorsB={sectorsB} />
        <TrackMapMini posA={currentA.trackPos} posB={currentB.trackPos} trackName={trackObj.name} />
      </section>

      <p className="font-hud-mono text-[10px] uppercase tracking-widest text-[hsl(var(--telemetry-muted))] text-center">
        Demo only · all telemetry synthesized in-browser · no live racer data
      </p>
    </main>
  );
}

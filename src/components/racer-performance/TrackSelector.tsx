import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TRACKS, SESSIONS, type Session } from "./mockTelemetry";

interface Props {
  trackId: string;
  session: Session;
  lap: number;
  onChangeTrack: (id: string) => void;
  onChangeSession: (s: Session) => void;
  onChangeLap: (n: number) => void;
}

export default function TrackSelector({
  trackId,
  session,
  lap,
  onChangeTrack,
  onChangeSession,
  onChangeLap,
}: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <Field label="Track">
        <Select value={trackId} onValueChange={onChangeTrack}>
          <SelectTrigger className="font-hud-mono bg-card/50 border-[hsl(var(--telemetry-grid))]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRACKS.map((t) => (
              <SelectItem key={t.id} value={t.id} className="font-hud-mono">
                {t.name}
                <span className="opacity-50 ml-2 text-xs">{t.length_km} km</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Session">
        <Select value={session} onValueChange={(v) => onChangeSession(v as Session)}>
          <SelectTrigger className="font-hud-mono bg-card/50 border-[hsl(var(--telemetry-grid))]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SESSIONS.map((s) => (
              <SelectItem key={s} value={s} className="font-hud-mono">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Lap">
        <Select value={String(lap)} onValueChange={(v) => onChangeLap(Number(v))}>
          <SelectTrigger className="font-hud-mono bg-card/50 border-[hsl(var(--telemetry-grid))]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
              <SelectItem key={n} value={String(n)} className="font-hud-mono">
                Lap {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-hud-mono text-[10px] uppercase tracking-[0.25em] mb-1 text-[hsl(var(--telemetry-muted))]">
        {label}
      </div>
      {children}
    </div>
  );
}

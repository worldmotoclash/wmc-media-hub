import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RACERS, FIELD, type Racer } from "./mockTelemetry";

interface Props {
  racerA: string;
  racerB: string;
  onChangeA: (id: string) => void;
  onChangeB: (id: string) => void;
}

export default function RacerSelector({ racerA, racerB, onChangeA, onChangeB }: Props) {
  const compareOptions: Racer[] = [FIELD, ...RACERS.filter((r) => r.id !== racerA)];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <LabelledSelect
        label="Racer A"
        value={racerA}
        onChange={onChangeA}
        options={RACERS}
        tone="primary"
      />
      <LabelledSelect
        label="Compare vs"
        value={racerB}
        onChange={onChangeB}
        options={compareOptions}
        tone="accent"
      />
    </div>
  );
}

function LabelledSelect({
  label,
  value,
  onChange,
  options,
  tone,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Racer[];
  tone: "primary" | "accent";
}) {
  const color =
    tone === "primary" ? "text-[hsl(var(--telemetry-primary))]" : "text-[hsl(var(--telemetry-accent))]";
  return (
    <div>
      <div className={`font-hud-mono text-[10px] uppercase tracking-[0.25em] mb-1 ${color}`}>
        {label}
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="font-hud-mono bg-card/50 border-[hsl(var(--telemetry-grid))]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((r) => (
            <SelectItem key={r.id} value={r.id} className="font-hud-mono">
              {r.id !== "field" && <span className="opacity-60 mr-2">#{r.number}</span>}
              {r.name}
              <span className="opacity-50 ml-2 text-xs">{r.team}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

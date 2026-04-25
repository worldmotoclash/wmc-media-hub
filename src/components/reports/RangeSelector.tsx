import { Button } from "@/components/ui/button";

export type Range = "7d" | "30d" | "60d" | "120d" | "1y" | "2y" | "all";

const OPTIONS: { value: Range; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "60d", label: "60D" },
  { value: "120d", label: "120D" },
  { value: "1y", label: "1Y" },
  { value: "2y", label: "2Y" },
  { value: "all", label: "ALL" },
];

export function rangeToDays(r: Range): number | null {
  switch (r) {
    case "7d": return 7;
    case "30d": return 30;
    case "60d": return 60;
    case "120d": return 120;
    case "1y": return 365;
    case "2y": return 730;
    case "all": return null;
  }
}

interface Props {
  value: Range;
  onChange: (r: Range) => void;
}

export default function RangeSelector({ value, onChange }: Props) {
  return (
    <div className="inline-flex flex-wrap gap-1 p-1 rounded-md bg-muted/40 border border-border">
      {OPTIONS.map((o) => (
        <Button
          key={o.value}
          size="sm"
          variant={value === o.value ? "default" : "ghost"}
          onClick={() => onChange(o.value)}
          className="font-hud-mono tracking-wider text-xs px-3 h-8"
        >
          {o.label}
        </Button>
      ))}
    </div>
  );
}

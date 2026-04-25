import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PlatformBlock {
  platform?: string;
  posts?: number;
  views?: number;
  engagements?: number;
  clicks?: number;
}

interface Row {
  report_date: string;
  platforms: unknown;
}

interface Props {
  rows: Row[];
}

const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

function toMap(list: PlatformBlock[]): Map<string, PlatformBlock> {
  const m = new Map<string, PlatformBlock>();
  for (const p of list) {
    const key = (p.platform ?? "unknown").toLowerCase();
    m.set(key, p);
  }
  return m;
}

export default function PlatformBreakdownChart({ rows }: Props) {
  const data = useMemo(() => {
    if (rows.length === 0) return [];

    const sorted = [...rows].sort((a, b) => a.report_date.localeCompare(b.report_date));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const firstList = Array.isArray(first.platforms) ? (first.platforms as PlatformBlock[]) : [];
    const lastList = Array.isArray(last.platforms) ? (last.platforms as PlatformBlock[]) : [];

    const firstMap = sorted.length > 1 ? toMap(firstList) : new Map<string, PlatformBlock>();
    const lastMap = toMap(lastList);

    // Use latest snapshot's platforms as the universe; subtract earliest if present.
    const out = Array.from(lastMap.entries()).map(([key, lp]) => {
      const fp = firstMap.get(key);
      const sub = (a?: number, b?: number) => Math.max(0, Number(a ?? 0) - Number(b ?? 0));
      return {
        platform: key.charAt(0).toUpperCase() + key.slice(1),
        Views: sub(lp.views, fp?.views),
        Engagements: sub(lp.engagements, fp?.engagements),
        Clicks: sub(lp.clicks, fp?.clicks),
        Posts: sub(lp.posts, fp?.posts),
      };
    });

    return out.sort((a, b) => b.Views - a.Views);
  }, [rows]);

  return (
    <Card className="mb-10">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Platform Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            No platform data in selected range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="platform"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmtCompact}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
                width={48}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                formatter={(v: number) => new Intl.NumberFormat("en-US").format(v)}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Views" fill="hsl(var(--telemetry-primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Engagements" fill="hsl(var(--telemetry-accent))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Clicks" fill="hsl(var(--telemetry-secondary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

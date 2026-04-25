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
  platforms: unknown;
}

interface Props {
  rows: Row[];
}

const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export default function PlatformBreakdownChart({ rows }: Props) {
  const data = useMemo(() => {
    const acc = new Map<string, { platform: string; Views: number; Engagements: number; Clicks: number; Posts: number }>();
    for (const r of rows) {
      const list = Array.isArray(r.platforms) ? (r.platforms as PlatformBlock[]) : [];
      for (const p of list) {
        const key = (p.platform ?? "unknown").toLowerCase();
        const cur = acc.get(key) ?? { platform: key, Views: 0, Engagements: 0, Clicks: 0, Posts: 0 };
        cur.Views += Number(p.views ?? 0);
        cur.Engagements += Number(p.engagements ?? 0);
        cur.Clicks += Number(p.clicks ?? 0);
        cur.Posts += Number(p.posts ?? 0);
        acc.set(key, cur);
      }
    }
    return Array.from(acc.values())
      .sort((a, b) => b.Views - a.Views)
      .map((d) => ({ ...d, platform: d.platform.charAt(0).toUpperCase() + d.platform.slice(1) }));
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

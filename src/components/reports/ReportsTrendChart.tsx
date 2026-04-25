import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface TrendRow {
  report_date: string;
  total_posts: number;
  total_views: number;
  total_engagements: number;
  total_clicks: number;
}

interface Props {
  rows: TrendRow[];
}

const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export default function ReportsTrendChart({ rows }: Props) {
  // Chronological for the chart
  const data = [...rows]
    .sort((a, b) => a.report_date.localeCompare(b.report_date))
    .map((r) => ({
      date: r.report_date,
      Posts: r.total_posts,
      Views: r.total_views,
      Engagements: r.total_engagements,
      Clicks: r.total_clicks,
    }));

  return (
    <Card className="mb-8">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Performance Trend</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            No data in selected range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--telemetry-primary))" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="hsl(var(--telemetry-primary))" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                yAxisId="left"
                tickFormatter={fmtCompact}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
                width={48}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={fmtCompact}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 6,
                  fontSize: 12,
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(v: number) => new Intl.NumberFormat("en-US").format(v)}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="Views"
                stroke="hsl(var(--telemetry-primary))"
                strokeWidth={2}
                fill="url(#viewsFill)"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="Engagements"
                stroke="hsl(var(--telemetry-accent))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="Clicks"
                stroke="hsl(var(--telemetry-secondary))"
                strokeWidth={2}
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="Posts"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

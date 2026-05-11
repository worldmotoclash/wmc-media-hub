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
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface RacerTrendRow {
  report_date: string;
  slug?: string;
  total_contacts: number;
  contact_profiles_complete: number;
  readiness_profiles_started: number;
  created_today: number;
  updated_contacts: number;
  new_vs_previous: number;
}

interface Props {
  rows: RacerTrendRow[];
}

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);
const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export default function RacerReportsTrendChart({ rows }: Props) {
  const navigate = useNavigate();

  const data = [...rows]
    .sort((a, b) => a.report_date.localeCompare(b.report_date))
    .map((r) => ({
      date: r.report_date,
      slug: r.slug,
      Contacts: r.total_contacts,
      Complete: r.contact_profiles_complete,
      Readiness: r.readiness_profiles_started,
      Created: r.created_today,
      Updated: r.updated_contacts,
      New: r.new_vs_previous,
    }));

  const goTo = (slug?: string) => {
    if (slug) navigate(`/racer/reports/${slug}`);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;
    const slug = payload[0]?.payload?.slug as string | undefined;
    return (
      <div
        onClick={() => goTo(slug)}
        className={`rounded-md border border-border bg-popover/95 backdrop-blur px-3 py-2 text-xs shadow-lg pointer-events-auto ${
          slug ? "cursor-pointer hover:border-[hsl(var(--telemetry-primary))]" : ""
        }`}
      >
        <div className="font-medium text-foreground mb-1">{label}</div>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2" style={{ color: p.color }}>
            <span>{p.dataKey}</span>
            <span>:</span>
            <span>{fmt(p.value as number)}</span>
          </div>
        ))}
        {slug && (
          <div className="mt-1.5 pt-1.5 border-t border-border text-[10px] uppercase tracking-widest text-[hsl(var(--telemetry-primary))]">
            View report →
          </div>
        )}
      </div>
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChartClick = (e: any) => {
    const slug = e?.activePayload?.[0]?.payload?.slug;
    goTo(slug);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dotClick = (_: unknown, payload: any) => goTo(payload?.payload?.slug);

  return (
    <Card className="mb-8">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">
          Racer KPIs Over Time{" "}
          <span className="text-xs font-normal text-muted-foreground">
            (click a point to open the report)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            No data in selected range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
              onClick={handleChartClick}
              style={{ cursor: "pointer" }}
            >
              <defs>
                <linearGradient id="contactsFill" x1="0" y1="0" x2="0" y2="1">
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
                content={<CustomTooltip />}
                cursor={{
                  stroke: "hsl(var(--telemetry-primary))",
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="Contacts"
                stroke="hsl(var(--telemetry-primary))"
                strokeWidth={2}
                fill="url(#contactsFill)"
                activeDot={{ r: 6, style: { cursor: "pointer" }, onClick: dotClick }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="Complete"
                stroke="hsl(var(--telemetry-accent))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, style: { cursor: "pointer" }, onClick: dotClick }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="Readiness"
                stroke="hsl(var(--telemetry-secondary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, style: { cursor: "pointer" }, onClick: dotClick }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="Created"
                stroke="hsl(var(--telemetry-warning, 38 92% 50%))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, style: { cursor: "pointer" }, onClick: dotClick }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="Updated"
                stroke="hsl(var(--muted-foreground))"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                activeDot={{ r: 4, style: { cursor: "pointer" }, onClick: dotClick }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="New"
                stroke="hsl(var(--primary))"
                strokeWidth={1.5}
                strokeDasharray="2 4"
                dot={false}
                activeDot={{ r: 4, style: { cursor: "pointer" }, onClick: dotClick }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

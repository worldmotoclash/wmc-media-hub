import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import RangeSelector, { Range, rangeToDays } from "@/components/reports/RangeSelector";
import ReportsTrendChart from "@/components/reports/ReportsTrendChart";
import PlatformBreakdownChart from "@/components/reports/PlatformBreakdownChart";

interface ReportRow {
  id: string;
  slug: string;
  title: string;
  report_date: string;
  total_posts: number;
  total_views: number;
  total_engagements: number;
  total_clicks: number;
  platforms: unknown;
}

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);
const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export default function ReportsArchive() {
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<Range>("30d");

  useEffect(() => {
    document.title = "Social Performance Reports — World Moto Clash";
    (async () => {
      const { data, error } = await supabase
        .from("social_performance_reports")
        .select("id, slug, title, report_date, total_posts, total_views, total_engagements, total_clicks, platforms")
        .order("report_date", { ascending: false })
        .limit(1000);
      if (error) {
        setError(error.message);
        setRows([]);
        return;
      }
      setRows((data as ReportRow[]) ?? []);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const days = rangeToDays(range);
    if (days === null) return rows;
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days);
    return rows.filter((r) => new Date(r.report_date) >= cutoff);
  }, [rows, range]);

  // Period delta: latest snapshot − earliest snapshot in range.
  // Each row's totals are cumulative running counts from the ingest, so summing
  // would double-count. The delta represents activity added during the period.
  const { totals, periodInfo } = useMemo(() => {
    if (filtered.length === 0) {
      return {
        totals: { posts: 0, views: 0, engagements: 0, clicks: 0 },
        periodInfo: null as null | { from: string; to: string; count: number },
      };
    }
    const sorted = [...filtered].sort((a, b) =>
      a.report_date.localeCompare(b.report_date)
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (sorted.length === 1) {
      return {
        totals: {
          posts: last.total_posts || 0,
          views: last.total_views || 0,
          engagements: last.total_engagements || 0,
          clicks: last.total_clicks || 0,
        },
        periodInfo: { from: last.report_date, to: last.report_date, count: 1 },
      };
    }
    return {
      totals: {
        posts: Math.max(0, (last.total_posts || 0) - (first.total_posts || 0)),
        views: Math.max(0, (last.total_views || 0) - (first.total_views || 0)),
        engagements: Math.max(
          0,
          (last.total_engagements || 0) - (first.total_engagements || 0)
        ),
        clicks: Math.max(0, (last.total_clicks || 0) - (first.total_clicks || 0)),
      },
      periodInfo: { from: first.report_date, to: last.report_date, count: sorted.length },
    };
  }, [filtered]);

  return (
    <main className="container mx-auto px-4 py-10 max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Social Performance Reports</h1>
          <p className="text-muted-foreground mt-2">
            Daily archive of automated social media performance for World Moto Clash.
          </p>
        </div>
        <Link
          to="/racer-performance"
          className="font-hud-mono text-[10px] uppercase tracking-widest text-[hsl(var(--telemetry-muted))] hover:text-[hsl(var(--telemetry-accent))] border border-[hsl(var(--telemetry-grid))] px-3 py-1.5 rounded-sm"
        >
          Demo · Racer Telemetry →
        </Link>
      </header>

      <div className="mb-8">
        <RangeSelector value={range} onChange={setRange} />
      </div>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6 text-destructive">Failed to load: {error}</CardContent>
        </Card>
      )}

      {rows === null ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <KpiCard label="Posts" value={fmt(totals.posts)} />
            <KpiCard label="Views" value={fmtCompact(totals.views)} />
            <KpiCard label="Engagements" value={fmtCompact(totals.engagements)} />
            <KpiCard label="Clicks" value={fmtCompact(totals.clicks)} />
          </section>

          <ReportsTrendChart rows={filtered} />
          <PlatformBreakdownChart rows={filtered} />

          <h2 className="text-2xl font-semibold mb-4">
            Reports{" "}
            <span className="text-sm text-muted-foreground font-normal">
              ({filtered.length})
            </span>
          </h2>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-muted-foreground">
                No reports in the selected range.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((r) => (
                <Link key={r.id} to={`/reports/${r.slug}`} className="block">
                  <Card className="hover:border-primary transition-colors">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center justify-between gap-4">
                        <span>{r.title}</span>
                        <span className="text-sm font-normal text-muted-foreground">
                          {r.report_date}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <Metric label="Posts" value={fmt(r.total_posts)} />
                        <Metric label="Views" value={fmt(r.total_views)} />
                        <Metric label="Engagements" value={fmt(r.total_engagements)} />
                        <Metric label="Clicks" value={fmt(r.total_clicks)} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="font-hud-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </div>
        <div className="font-hud-display text-4xl mt-1 text-foreground">{value}</div>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground text-xs uppercase tracking-wide">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

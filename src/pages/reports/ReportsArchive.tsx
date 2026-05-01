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
  total_shares: number;
  platforms: unknown;
}

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);
const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export default function ReportsArchive() {
  const [allReports, setAllReports] = useState<ReportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<Range>("all");

  useEffect(() => {
    document.title = "Social Performance Reports — World Moto Clash";
    (async () => {
      const { data, error } = await supabase
        .from("social_performance_reports")
        .select("id, slug, title, report_date, total_posts, total_views, total_engagements, total_clicks, total_shares, platforms")
        .order("report_date", { ascending: false })
        .limit(1000);
      if (error) {
        setError(error.message);
        setAllReports([]);
        return;
      }
      setAllReports((data as ReportRow[]) ?? []);
    })();
  }, []);

  const filteredReports = useMemo(() => {
    if (!allReports) return [];
    const days = rangeToDays(selectedRange);
    if (days === null) return allReports;
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days);
    return allReports.filter((r) => new Date(r.report_date) >= cutoff);
  }, [allReports, selectedRange]);

  // Each report stores cumulative snapshot totals. Show the LATEST report
  // within the selected window — not a sum (summing inflates the numbers).
  const { totalPosts, totalViews, totalEngagements, totalClicks, totalShares, periodInfo, asOfDate } = useMemo(() => {
    if (filteredReports.length === 0) {
      return {
        totalPosts: 0,
        totalViews: 0,
        totalEngagements: 0,
        totalClicks: 0,
        totalShares: 0,
        periodInfo: null as null | { from: string; to: string; count: number },
        asOfDate: null as string | null,
      };
    }
    const sorted = [...filteredReports].sort((a, b) =>
      a.report_date.localeCompare(b.report_date)
    );
    const latest = sorted[sorted.length - 1];
    return {
      totalPosts: latest.total_posts || 0,
      totalViews: latest.total_views || 0,
      totalEngagements: latest.total_engagements || 0,
      totalClicks: latest.total_clicks || 0,
      totalShares: latest.total_shares || 0,
      periodInfo: {
        from: sorted[0].report_date,
        to: latest.report_date,
        count: sorted.length,
      },
      asOfDate: latest.report_date,
    };
  }, [filteredReports]);

  const rangeLabel = useMemo(() => {
    switch (selectedRange) {
      case "all": return "ALL REPORTS";
      case "7d": return "LAST 7 DAYS";
      case "30d": return "LAST 30 DAYS";
      case "60d": return "LAST 60 DAYS";
      case "120d": return "LAST 120 DAYS";
      case "1y": return "LAST 1 YEAR";
      case "2y": return "LAST 2 YEARS";
    }
  }, [selectedRange]);

  return (
    <main className="container mx-auto px-4 py-10 max-w-6xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Social Performance Reports</h1>
          <p className="text-muted-foreground mt-2">
            Daily archive of automated social media performance for World Moto Clash.
          </p>
        </div>
      </header>

      <div className="mb-8">
        <RangeSelector value={selectedRange} onChange={setSelectedRange} />
      </div>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6 text-destructive">Failed to load: {error}</CardContent>
        </Card>
      )}

      {allReports === null ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        <>
          {/* Active range label */}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="font-hud-mono text-[11px] uppercase tracking-[0.25em] text-[hsl(var(--telemetry-primary))] border border-[hsl(var(--telemetry-grid))] px-2.5 py-1 rounded-sm">
              {rangeLabel}
            </span>
            {periodInfo && (
              <span className="font-hud-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {periodInfo.count} {periodInfo.count === 1 ? "report" : "reports"} · {periodInfo.from} → {periodInfo.to}
              </span>
            )}
          </div>

          {/* KPI cards — total aggregates across selected window */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <KpiCard label="Posts" value={fmt(totalPosts)} caption={asOfDate ? `as of ${asOfDate}` : undefined} />
            <KpiCard label="Views" value={fmt(totalViews)} caption={asOfDate ? `as of ${asOfDate}` : undefined} />
            <KpiCard label="Engagements" value={fmt(totalEngagements)} caption={asOfDate ? `as of ${asOfDate}` : undefined} />
            <KpiCard label="Clicks" value={fmt(totalClicks)} caption={asOfDate ? `as of ${asOfDate}` : undefined} />
          </section>

          <ReportsTrendChart rows={filteredReports} />
          <PlatformBreakdownChart rows={filteredReports} />

          <h2 className="text-2xl font-semibold mb-4">
            Reports{" "}
            <span className="text-sm text-muted-foreground font-normal">
              ({filteredReports.length})
            </span>
          </h2>

          {filteredReports.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-muted-foreground">
                No reports in the selected range.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredReports.map((r) => (
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

function KpiCard({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="font-hud-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          {label}
        </div>
        <div className="font-hud-display text-4xl mt-1 text-foreground">{value}</div>
        {caption && (
          <div className="font-hud-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mt-2">
            {caption}
          </div>
        )}
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

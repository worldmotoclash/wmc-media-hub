import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import RangeSelector, { Range, rangeToDays } from "@/components/reports/RangeSelector";
import RacerReportsTrendChart from "@/components/racer/reports/RacerReportsTrendChart";
import { useRacerReportsGuard } from "@/hooks/useRacerReportsGuard";

interface Row {
  id: string;
  slug: string;
  title: string;
  heading: string | null;
  report_date: string;
  totals: Record<string, number> | null;
}

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

function pickTotals(t: Record<string, number> | null) {
  const o = t || {};
  return {
    total_contacts: num(o.total_contacts),
    contact_profiles_complete: num(o.contact_profiles_complete),
    readiness_profiles_started: num(o.readiness_profiles_started),
    created_today: num(o.created_today),
    updated_contacts: num(o.updated_contacts),
    new_vs_previous: num(o.new_vs_previous),
    regressions: num(o.regressions),
  };
}

export default function RacerContactReportsArchive() {
  const blocked = useRacerReportsGuard();
  const [allRows, setAllRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<Range>("all");

  useEffect(() => {
    document.title = "Racer Application Dashboard — World Moto Clash";
    (async () => {
      const { data, error } = await supabase
        .from("racer_contact_reports")
        .select("id, slug, title, heading, report_date, totals")
        .order("report_date", { ascending: false })
        .limit(1000);
      if (error) {
        setError(error.message);
        setAllRows([]);
        return;
      }
      setAllRows((data as Row[]) ?? []);
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!allRows) return [];
    const days = rangeToDays(selectedRange);
    if (days === null) return allRows;
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days);
    return allRows.filter((r) => new Date(r.report_date) >= cutoff);
  }, [allRows, selectedRange]);

  const trendRows = useMemo(
    () => filtered.map((r) => ({ report_date: r.report_date, slug: r.slug, ...pickTotals(r.totals) })),
    [filtered]
  );

  const { latest, periodInfo, sums } = useMemo(() => {
    if (filtered.length === 0) {
      return { latest: null as ReturnType<typeof pickTotals> | null, periodInfo: null, sums: { created: 0, updated: 0, regressions: 0 } };
    }
    const sorted = [...filtered].sort((a, b) => a.report_date.localeCompare(b.report_date));
    const latestRow = sorted[sorted.length - 1];
    const sums = sorted.reduce(
      (acc, r) => {
        const t = pickTotals(r.totals);
        acc.created += t.created_today;
        acc.updated += t.updated_contacts;
        acc.regressions += t.regressions;
        return acc;
      },
      { created: 0, updated: 0, regressions: 0 }
    );
    return {
      latest: pickTotals(latestRow.totals),
      periodInfo: { from: sorted[0].report_date, to: latestRow.report_date, count: sorted.length, asOf: latestRow.report_date },
      sums,
    };
  }, [filtered]);

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
      <header className="mb-6">
        <h1 className="text-4xl font-bold tracking-tight">Racer Application Dashboard</h1>
        <p className="text-muted-foreground mt-2 max-w-2xl">
          Daily snapshots of the racer contact feed: new sign-ups, updates, regressions, and profile readiness.
        </p>
      </header>

      <div className="mb-8">
        <RangeSelector value={selectedRange} onChange={setSelectedRange} />
      </div>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6 text-destructive">Failed to load: {error}</CardContent>
        </Card>
      )}

      {allRows === null ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        <>
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

          <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-4">
            <KpiCard label="Total Contacts" value={fmt(latest?.total_contacts ?? 0)} caption={periodInfo ? `as of ${periodInfo.asOf}` : undefined} />
            <KpiCard label="Complete Profiles" value={fmt(latest?.contact_profiles_complete ?? 0)} caption={periodInfo ? `as of ${periodInfo.asOf}` : undefined} />
            <KpiCard label="Readiness Started" value={fmt(latest?.readiness_profiles_started ?? 0)} caption={periodInfo ? `as of ${periodInfo.asOf}` : undefined} />
            <KpiCard label="Created Today" value={fmt(latest?.created_today ?? 0)} caption="latest report" />
            <KpiCard label="Updated" value={fmt(latest?.updated_contacts ?? 0)} caption="latest report" />
          </section>

          <section className="grid grid-cols-3 gap-4 mb-8">
            <KpiCard label="Σ Created" value={fmt(sums.created)} caption="across window" small />
            <KpiCard label="Σ Updated" value={fmt(sums.updated)} caption="across window" small />
            <KpiCard label="Σ Regressions" value={fmt(sums.regressions)} caption="across window" small />
          </section>

          <RacerReportsTrendChart rows={trendRows} />

          <h2 className="text-2xl font-semibold mb-4">
            Reports{" "}
            <span className="text-sm text-muted-foreground font-normal">({filtered.length})</span>
          </h2>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-muted-foreground">No reports in the selected range.</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filtered.map((r) => {
                const t = pickTotals(r.totals);
                return (
                  <Link key={r.id} to={`/racer/reports/${r.slug}`} className="block">
                    <Card className="hover:border-primary transition-colors">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center justify-between gap-4">
                          <span>{r.heading || r.title}</span>
                          <span className="text-sm font-normal text-muted-foreground">{r.report_date}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                          <Metric label="Contacts" value={fmt(t.total_contacts)} />
                          <Metric label="Complete" value={fmt(t.contact_profiles_complete)} />
                          <Metric label="Readiness" value={fmt(t.readiness_profiles_started)} />
                          <Metric label="Created" value={fmt(t.created_today)} />
                          <Metric label="Updated" value={fmt(t.updated_contacts)} />
                          <Metric label="New vs Prev" value={fmt(t.new_vs_previous)} />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </main>
  );
}

function KpiCard({ label, value, caption, small }: { label: string; value: string; caption?: string; small?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="font-hud-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
        <div className={`font-hud-display ${small ? "text-2xl" : "text-4xl"} mt-1 text-foreground`}>{value}</div>
        {caption && (
          <div className="font-hud-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground mt-2">{caption}</div>
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

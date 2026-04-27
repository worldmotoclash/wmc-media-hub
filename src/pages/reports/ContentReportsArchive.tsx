import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface ContentReportRow {
  id: string;
  slug: string;
  title: string;
  period_type: "daily" | "weekly";
  report_date: string;
  period_start: string | null;
  period_end: string | null;
  heading: string | null;
  subheading: string | null;
  summary_text: string;
  asset_counts: Record<string, number> | null;
}

const fmt = (n?: number) =>
  typeof n === "number" ? new Intl.NumberFormat("en-US").format(n) : "0";

function fmtDate(s?: string | null) {
  if (!s) return "";
  // Anchor at noon UTC so "2026-04-26" doesn't slip across a TZ boundary.
  const d = new Date(s + "T12:00:00Z");
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function CountChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs">
      <span className="font-semibold tabular-nums">{fmt(value)}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

function ReportCard({
  report,
  routeSegment,
}: {
  report: ContentReportRow;
  routeSegment: "daily" | "weekly";
}) {
  const c = report.asset_counts || {};
  const periodLabel =
    routeSegment === "weekly" && report.period_start && report.period_end
      ? `${fmtDate(report.period_start)} – ${fmtDate(report.period_end)}`
      : fmtDate(report.report_date);

  return (
    <Link
      to={`/content-reports/${routeSegment}/${report.slug}`}
      className="block transition-transform hover:-translate-y-0.5"
    >
      <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base leading-snug">
                {report.heading || report.title}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">{periodLabel}</p>
            </div>
            <Badge
              variant="secondary"
              className="capitalize shrink-0"
            >
              {report.period_type}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {report.summary_text && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {report.summary_text}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            <CountChip label="total" value={Number(c.total) || 0} />
            <CountChip label="videos" value={Number(c.videos) || 0} />
            <CountChip label="images" value={Number(c.images) || 0} />
            <CountChip label="audio" value={Number(c.audio) || 0} />
            <CountChip label="other" value={Number(c.other) || 0} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ContentReportsArchive() {
  const [rows, setRows] = useState<ContentReportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Media Hub Content Reports — World Moto Clash";
    (async () => {
      const { data, error } = await supabase
        .from("mediahub_content_reports")
        .select(
          "id, slug, title, period_type, report_date, period_start, period_end, heading, subheading, summary_text, asset_counts",
        )
        .order("report_date", { ascending: false })
        .limit(500);
      if (error) {
        setError(error.message);
        setRows([]);
        return;
      }
      setRows((data as ContentReportRow[]) ?? []);
    })();
  }, []);

  const { daily, weekly } = useMemo(() => {
    const d: ContentReportRow[] = [];
    const w: ContentReportRow[] = [];
    for (const r of rows ?? []) {
      if (r.period_type === "weekly") w.push(r);
      else d.push(r);
    }
    return { daily: d, weekly: w };
  }, [rows]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Media Hub Content Reports
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Daily and weekly summaries of all content uploaded to the World
            Moto Clash Media Hub.
          </p>
        </header>

        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6 text-sm text-destructive">
              Failed to load reports: {error}
            </CardContent>
          </Card>
        )}

        {!rows ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        ) : (
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="daily">
                Daily ({daily.length})
              </TabsTrigger>
              <TabsTrigger value="weekly">
                Weekly ({weekly.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="daily">
              {daily.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No daily reports yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {daily.map((r) => (
                    <ReportCard key={r.id} report={r} routeSegment="daily" />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="weekly">
              {weekly.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No weekly reports yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {weekly.map((r) => (
                    <ReportCard key={r.id} report={r} routeSegment="weekly" />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}

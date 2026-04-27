import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Film, Image as ImageIcon, Music, FileQuestion, Layers } from "lucide-react";

interface AssetItem {
  name?: string;
  url?: string;
  type?: string;
  created_text?: string;
}

interface DayBreakdown {
  day_label?: string;
  counts?: Record<string, number>;
  items?: AssetItem[];
}

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
  assets: AssetItem[];
  day_breakdown: DayBreakdown[] | null;
  generated_at: string;
}

const fmt = (n?: number) =>
  typeof n === "number" ? new Intl.NumberFormat("en-US").format(n) : "0";

function fmtDateTime(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString();
}

function fmtAssetDate(s?: string) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

function CountCard({
  label,
  value,
  Icon,
}: {
  label: string;
  value: number;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums leading-none">
              {fmt(value)}
            </div>
            <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">
              {label}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AssetTypeBadge({ type }: { type?: string }) {
  if (!type) return null;
  return (
    <Badge variant="outline" className="text-[10px] uppercase font-mono">
      {type}
    </Badge>
  );
}

function AssetRow({ asset }: { asset: AssetItem }) {
  const created = fmtAssetDate(asset.created_text);
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">
            {asset.name || "(untitled)"}
          </span>
          <AssetTypeBadge type={asset.type} />
        </div>
        {created && (
          <div className="text-xs text-muted-foreground mt-0.5">{created}</div>
        )}
      </div>
      {asset.url && (
        <a
          href={asset.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Open <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

export default function ContentReportDetail({
  expectedPeriod,
}: {
  expectedPeriod: "daily" | "weekly";
}) {
  const { slug } = useParams<{ slug: string }>();
  const [report, setReport] = useState<ContentReportRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("mediahub_content_reports")
        .select(
          "id, slug, title, period_type, report_date, period_start, period_end, heading, subheading, summary_text, asset_counts, assets, day_breakdown, generated_at",
        )
        .eq("slug", slug)
        .eq("period_type", expectedPeriod)
        .maybeSingle();
      if (error) {
        setError(error.message);
      } else if (!data) {
        setError("Report not found");
      } else {
        setReport(data as unknown as ContentReportRow);
        document.title = `${(data as any).heading || (data as any).title} — World Moto Clash`;
      }
      setLoading(false);
    })();
  }, [slug, expectedPeriod]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-5xl space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64 w-full mt-4" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive">{error || "Report not found"}</p>
            <Link
              to="/content-reports"
              className="text-sm text-primary hover:underline mt-3 inline-block"
            >
              ← Back to all reports
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const c = report.asset_counts || {};

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <Link
          to="/content-reports"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← All content reports
        </Link>

        <header className="mt-4 mb-8">
          <Badge variant="secondary" className="capitalize mb-3">
            {report.period_type} report
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {report.heading || report.title}
          </h1>
          {report.subheading && (
            <p className="text-lg text-muted-foreground mt-2">
              {report.subheading}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-3">
            Generated {fmtDateTime(report.generated_at)}
          </p>
        </header>

        {report.summary_text && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <p className="text-base leading-relaxed">{report.summary_text}</p>
            </CardContent>
          </Card>
        )}

        <section className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <CountCard label="Total" value={Number(c.total) || 0} Icon={Layers} />
          <CountCard label="Videos" value={Number(c.videos) || 0} Icon={Film} />
          <CountCard label="Images" value={Number(c.images) || 0} Icon={ImageIcon} />
          <CountCard label="Audio" value={Number(c.audio) || 0} Icon={Music} />
          <CountCard label="Other" value={Number(c.other) || 0} Icon={FileQuestion} />
        </section>

        {report.period_type === "weekly" &&
          Array.isArray(report.day_breakdown) &&
          report.day_breakdown.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Daily breakdown</h2>
              <div className="space-y-4">
                {report.day_breakdown.map((day, idx) => {
                  const dc = day.counts || {};
                  return (
                    <Card key={idx}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <CardTitle className="text-base">
                            {day.day_label || `Day ${idx + 1}`}
                          </CardTitle>
                          <div className="flex flex-wrap gap-1.5 text-xs">
                            <Badge variant="outline">
                              {fmt(Number(dc.total) || 0)} total
                            </Badge>
                            <Badge variant="outline">
                              {fmt(Number(dc.videos) || 0)} videos
                            </Badge>
                            <Badge variant="outline">
                              {fmt(Number(dc.images) || 0)} images
                            </Badge>
                            <Badge variant="outline">
                              {fmt(Number(dc.audio) || 0)} audio
                            </Badge>
                            <Badge variant="outline">
                              {fmt(Number(dc.other) || 0)} other
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      {Array.isArray(day.items) && day.items.length > 0 && (
                        <CardContent className="pt-0">
                          {day.items.map((item, i) => (
                            <AssetRow key={i} asset={item} />
                          ))}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

        <section>
          <h2 className="text-xl font-semibold mb-4">
            All assets ({report.assets?.length ?? 0})
          </h2>
          <Card>
            <CardContent className="pt-2">
              {Array.isArray(report.assets) && report.assets.length > 0 ? (
                report.assets.map((a, i) => <AssetRow key={i} asset={a} />)
              ) : (
                <p className="text-sm text-muted-foreground py-4">
                  No assets in this report.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

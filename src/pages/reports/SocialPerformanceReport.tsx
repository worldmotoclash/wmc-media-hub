import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink } from "lucide-react";

type MetricMode = "clicks" | "shares";

interface TopPost {
  platform: string;
  post_url?: string;
  name?: string;
  views?: number;
  engagements?: number;
  clicks?: number;
  shares?: number;
  primary_metric_label?: string;
  primary_metric_value?: number;
  published_date?: string;
  content_id?: string;
  status_summary?: string;
}

interface PlatformBlock {
  platform: string;
  display_name?: string;
  metric_mode?: MetricMode;
  primary_metric_label?: string;
  primary_metric_value?: number;
  posts?: number;
  views?: number;
  engagements?: number;
  clicks?: number;
  shares?: number;
  sort_order?: number;
  top_posts?: TopPost[];
}

interface Presentation {
  click_first_platforms?: string[];
  share_first_platforms?: string[];
}

interface ReportRow {
  id: string;
  title: string;
  slug: string;
  report_date: string;
  generated_at: string;
  since: string;
  total_posts: number;
  total_views: number;
  total_engagements: number;
  total_clicks: number;
  total_shares: number;
  platforms: PlatformBlock[];
  top_overall: TopPost[];
  raw_payload: { presentation?: Presentation } | null;
}

const CLICK_ORDER = ["facebook", "twitter", "linkedin"];
const SHARE_ORDER = ["youtube", "instagram", "tiktok"];

const fmt = (n?: number) => (typeof n === "number" ? new Intl.NumberFormat("en-US").format(n) : "—");
const fmtDate = (s?: string) => (s ? new Date(s).toLocaleString() : "—");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function modeOf(p: PlatformBlock): MetricMode {
  if (p.metric_mode === "clicks" || p.metric_mode === "shares") return p.metric_mode;
  // Fallback for legacy payloads: treat known share-first platforms as shares
  if (SHARE_ORDER.includes(p.platform.toLowerCase())) return "shares";
  return "clicks";
}

function primaryLabel(p: PlatformBlock): string {
  if (p.primary_metric_label) return p.primary_metric_label;
  return modeOf(p) === "shares" ? "Shares" : "Clicks";
}

function primaryValue(p: PlatformBlock): number | undefined {
  if (typeof p.primary_metric_value === "number") return p.primary_metric_value;
  return modeOf(p) === "shares" ? p.shares : p.clicks;
}

function postPrimaryValue(post: TopPost, mode: MetricMode): number | undefined {
  if (typeof post.primary_metric_value === "number") return post.primary_metric_value;
  return mode === "shares" ? post.shares : post.clicks;
}

function postPrimaryLabel(post: TopPost, fallback: string): string {
  return post.primary_metric_label ?? fallback;
}

function sortPlatformsByCanonical(list: PlatformBlock[], canonical: string[]): PlatformBlock[] {
  const idx = (p: PlatformBlock) => {
    const i = canonical.indexOf(p.platform.toLowerCase());
    return i === -1 ? 999 + (p.sort_order ?? 0) : i;
  };
  return [...list].sort((a, b) => {
    const da = idx(a);
    const db = idx(b);
    if (da !== db) return da - db;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

export default function SocialPerformanceReport() {
  const { slug } = useParams<{ slug: string }>();
  const [report, setReport] = useState<ReportRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("social_performance_reports")
        .select("id, title, slug, report_date, generated_at, since, total_posts, total_views, total_engagements, total_clicks, total_shares, platforms, top_overall, raw_payload")
        .eq("slug", slug)
        .maybeSingle();
      if (error) setError(error.message);
      else if (!data) setError("Report not found or not yet published.");
      else {
        setReport(data as unknown as ReportRow);
        document.title = `${(data as any).title} — World Moto Clash`;
      }
      setLoading(false);
    })();
  }, [slug]);

  const { clickPlatforms, sharePlatforms, allOrdered } = useMemo(() => {
    const platforms = Array.isArray(report?.platforms) ? report!.platforms : [];
    const clicks = platforms.filter((p) => modeOf(p) === "clicks");
    const shares = platforms.filter((p) => modeOf(p) === "shares");
    return {
      clickPlatforms: sortPlatformsByCanonical(clicks, CLICK_ORDER),
      sharePlatforms: sortPlatformsByCanonical(shares, SHARE_ORDER),
      allOrdered: [
        ...sortPlatformsByCanonical(clicks, CLICK_ORDER),
        ...sortPlatformsByCanonical(shares, SHARE_ORDER),
      ],
    };
  }, [report]);

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-10 max-w-6xl space-y-4">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </main>
    );
  }

  if (error || !report) {
    return (
      <main className="container mx-auto px-4 py-10 max-w-6xl">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive mb-2">{error ?? "Report not available."}</p>
            <Link to="/reports" className="text-primary underline">← Back to archive</Link>
          </CardContent>
        </Card>
      </main>
    );
  }

  const topOverall = Array.isArray(report.top_overall) ? report.top_overall : [];

  return (
    <main className="container mx-auto px-4 py-10 max-w-6xl">
      <Link to="/reports" className="text-sm text-muted-foreground hover:text-foreground">← All reports</Link>

      <header className="mt-3 mb-8">
        <h1 className="text-4xl font-bold tracking-tight">{report.title}</h1>
        <p className="text-muted-foreground mt-2">
          Report date: <strong>{report.report_date}</strong> · Window:{" "}
          {fmtDate(report.since)} → {fmtDate(report.generated_at)}
        </p>
      </header>

      {/* Top-level totals: 5 cards — never combine clicks + shares */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
        <TotalCard label="Total Posts" value={fmt(report.total_posts)} />
        <TotalCard label="Total Views" value={fmt(report.total_views)} />
        <TotalCard label="Total Engagements" value={fmt(report.total_engagements)} />
        <TotalCard
          label="Total Clicks"
          value={fmt(report.total_clicks)}
          caption="FB · Tw · LI"
        />
        <TotalCard
          label="Total Shares"
          value={fmt(report.total_shares)}
          caption="YT · IG · TT"
        />
      </section>

      {/* Platform Summary — two clearly separated rows */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Platform Summary</h2>

        <PlatformRow
          heading="Click-based platforms"
          subheading="Primary metric: Clicks"
          platforms={clickPlatforms}
        />

        <PlatformRow
          heading="Share-based platforms"
          subheading="Primary metric: Shares"
          platforms={sharePlatforms}
          className="mt-6"
        />
      </section>

      {/* Top overall */}
      {topOverall.length > 0 && (
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">Top Leaders</h2>
          <div className="space-y-3">
            {topOverall.map((post, i) => {
              const platform = allOrdered.find(
                (p) => p.platform.toLowerCase() === (post.platform ?? "").toLowerCase(),
              );
              const mode = platform ? modeOf(platform) : "clicks";
              return <PostRow key={`top-${i}`} post={post} mode={mode} />;
            })}
          </div>
        </section>
      )}

      {/* Per-platform breakdown — clicks group first, then shares group */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Per-Platform Breakdown</h2>
        <div className="space-y-8">
          {allOrdered.map((p) => {
            const mode = modeOf(p);
            const label = primaryLabel(p);
            return (
              <div key={`break-${p.platform}`}>
                <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                  <span>{p.display_name ?? cap(p.platform)}</span>
                  <Badge variant="outline" className="text-xs font-normal">
                    {label}
                  </Badge>
                </h3>
                {p.top_posts && p.top_posts.length > 0 ? (
                  <div className="space-y-3">
                    {p.top_posts.map((post, i) => (
                      <PostRow key={`${p.platform}-${i}`} post={post} mode={mode} primaryLabel={label} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No top posts reported.</p>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function PlatformRow({
  heading,
  subheading,
  platforms,
  className,
}: {
  heading: string;
  subheading: string;
  platforms: PlatformBlock[];
  className?: string;
}) {
  if (platforms.length === 0) return null;
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-base font-semibold">{heading}</h3>
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{subheading}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {platforms.map((p) => (
          <Card key={p.platform}>
            <CardHeader className="pb-2">
              <CardTitle className="capitalize flex items-center justify-between gap-2">
                <span>{p.display_name ?? cap(p.platform)}</span>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                  {primaryLabel(p)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
              <Metric label="Posts" value={fmt(p.posts)} />
              <Metric label="Views" value={fmt(p.views)} />
              <Metric label="Engagements" value={fmt(p.engagements)} />
              <Metric label={primaryLabel(p)} value={fmt(primaryValue(p))} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TotalCard({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-3xl font-bold mt-1">{value}</div>
        {caption && <div className="text-[11px] text-muted-foreground mt-1">{caption}</div>}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-muted-foreground text-xs uppercase tracking-wide">{label}</div>
      <div className="text-base font-semibold">{value}</div>
    </div>
  );
}

function PostRow({
  post,
  mode,
  primaryLabel: explicitLabel,
}: {
  post: TopPost;
  mode: MetricMode;
  primaryLabel?: string;
}) {
  const label = postPrimaryLabel(post, explicitLabel ?? (mode === "shares" ? "Shares" : "Clicks"));
  const value = postPrimaryValue(post, mode);
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="capitalize">{post.platform}</Badge>
              {post.published_date && (
                <span className="text-xs text-muted-foreground">{fmtDate(post.published_date)}</span>
              )}
            </div>
            <div className="font-medium truncate">{post.name ?? "(no title)"}</div>
            {post.status_summary && (
              <div className="text-xs text-muted-foreground mt-1">{post.status_summary}</div>
            )}
          </div>
          {post.post_url && (
            <a
              href={post.post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm flex items-center gap-1 shrink-0"
            >
              Open <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
          <Metric label="Views" value={fmt(post.views)} />
          <Metric label="Engagements" value={fmt(post.engagements)} />
          <Metric label={label} value={fmt(value)} />
        </div>
      </CardContent>
    </Card>
  );
}

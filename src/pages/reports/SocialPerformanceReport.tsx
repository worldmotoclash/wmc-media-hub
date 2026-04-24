import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink } from "lucide-react";

interface TopPost {
  platform: string;
  post_url?: string;
  name?: string;
  views?: number;
  engagements?: number;
  clicks?: number;
  published_date?: string;
  content_id?: string;
  status_summary?: string;
}

interface PlatformBlock {
  platform: string;
  posts?: number;
  views?: number;
  engagements?: number;
  clicks?: number;
  top_posts?: TopPost[];
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
  platforms: PlatformBlock[];
  top_overall: TopPost[];
}

const fmt = (n?: number) => (typeof n === "number" ? new Intl.NumberFormat("en-US").format(n) : "—");
const fmtDate = (s?: string) => (s ? new Date(s).toLocaleString() : "—");

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
        .select("id, title, slug, report_date, generated_at, since, total_posts, total_views, total_engagements, total_clicks, platforms, top_overall")
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

  const platforms = Array.isArray(report.platforms) ? report.platforms : [];
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

      {/* Top-level totals */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <TotalCard label="Total Posts" value={fmt(report.total_posts)} />
        <TotalCard label="Total Views" value={fmt(report.total_views)} />
        <TotalCard label="Total Engagements" value={fmt(report.total_engagements)} />
        <TotalCard label="Total Clicks" value={fmt(report.total_clicks)} />
      </section>

      {/* Platform summary cards */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Platform Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((p) => (
            <Card key={p.platform}>
              <CardHeader className="pb-2">
                <CardTitle className="capitalize">{p.platform}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-2 text-sm">
                <Metric label="Posts" value={fmt(p.posts)} />
                <Metric label="Views" value={fmt(p.views)} />
                <Metric label="Engagements" value={fmt(p.engagements)} />
                <Metric label="Clicks" value={fmt(p.clicks)} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Top overall */}
      {topOverall.length > 0 && (
        <section className="mb-10">
          <h2 className="text-2xl font-semibold mb-4">Top Leaders</h2>
          <div className="space-y-3">
            {topOverall.map((post, i) => (
              <PostRow key={`top-${i}`} post={post} />
            ))}
          </div>
        </section>
      )}

      {/* Per-platform breakdown */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Per-Platform Breakdown</h2>
        <div className="space-y-8">
          {platforms.map((p) => (
            <div key={`break-${p.platform}`}>
              <h3 className="text-xl font-semibold capitalize mb-3">{p.platform}</h3>
              {p.top_posts && p.top_posts.length > 0 ? (
                <div className="space-y-3">
                  {p.top_posts.map((post, i) => (
                    <PostRow key={`${p.platform}-${i}`} post={post} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No top posts reported.</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function TotalCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="text-3xl font-bold mt-1">{value}</div>
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

function PostRow({ post }: { post: TopPost }) {
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
          <Metric label="Clicks" value={fmt(post.clicks)} />
        </div>
      </CardContent>
    </Card>
  );
}

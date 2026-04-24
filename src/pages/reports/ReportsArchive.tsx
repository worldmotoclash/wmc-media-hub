import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ReportRow {
  id: string;
  slug: string;
  title: string;
  report_date: string;
  total_posts: number;
  total_views: number;
  total_engagements: number;
  total_clicks: number;
}

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n);

export default function ReportsArchive() {
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Social Performance Reports — World Moto Clash";
    (async () => {
      const { data, error } = await supabase
        .from("social_performance_reports")
        .select("id, slug, title, report_date, total_posts, total_views, total_engagements, total_clicks")
        .order("report_date", { ascending: false })
        .limit(200);
      if (error) {
        setError(error.message);
        setRows([]);
        return;
      }
      setRows((data as ReportRow[]) ?? []);
    })();
  }, []);

  return (
    <main className="container mx-auto px-4 py-10 max-w-6xl">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Social Performance Reports</h1>
        <p className="text-muted-foreground mt-2">
          Daily archive of automated social media performance for World Moto Clash.
        </p>
      </header>

      {error && (
        <Card className="mb-6 border-destructive">
          <CardContent className="pt-6 text-destructive">Failed to load: {error}</CardContent>
        </Card>
      )}

      {rows === null ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-muted-foreground">
            No published reports yet. Reports default to <strong>draft</strong> on ingest;
            flip <code>status</code> to <code>published</code> in the database to make them appear here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Link key={r.id} to={`/reports/${r.slug}`} className="block">
              <Card className="hover:border-primary transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between gap-4">
                    <span>{r.title}</span>
                    <span className="text-sm font-normal text-muted-foreground">{r.report_date}</span>
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
    </main>
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

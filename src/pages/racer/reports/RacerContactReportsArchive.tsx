import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Row {
  id: string;
  slug: string;
  title: string;
  heading: string | null;
  report_date: string;
  totals: Record<string, number> | null;
}

const fmt = (n?: number) =>
  typeof n === "number" ? new Intl.NumberFormat("en-US").format(n) : "0";

function fmtDate(s?: string | null) {
  if (!s) return "";
  const d = new Date(s + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function Chip({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs">
      <span className="font-semibold tabular-nums">{fmt(value)}</span>
      <span className="text-muted-foreground">{label}</span>
    </span>
  );
}

export default function RacerContactReportsArchive() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Racer Contact Daily Logs — World Moto Clash";
    (async () => {
      const { data, error } = await supabase
        .from("racer_contact_reports")
        .select("id, slug, title, heading, report_date, totals")
        .order("report_date", { ascending: false })
        .limit(500);
      if (error) {
        setError(error.message);
        setRows([]);
        return;
      }
      setRows((data as Row[]) ?? []);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Racer Contact Daily Logs
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Daily snapshots of the racer contact feed: new sign-ups, updates,
            regressions, and profile readiness.
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
              <Skeleton key={i} className="h-44 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reports yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((r) => {
              const t = r.totals || {};
              return (
                <Link
                  key={r.id}
                  to={`/racer/reports/${r.slug}`}
                  className="block transition-transform hover:-translate-y-0.5"
                >
                  <Card className="h-full hover:border-primary/50 hover:shadow-md transition-all">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-base leading-snug">
                            {r.heading || r.title}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-1">
                            {fmtDate(r.report_date)}
                          </p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">Daily</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex flex-wrap gap-1.5">
                        <Chip label="contacts" value={Number(t.total_contacts) || 0} />
                        <Chip label="created" value={Number(t.created_today) || 0} />
                        <Chip label="new vs prev" value={Number(t.new_vs_previous) || 0} />
                        <Chip label="updated" value={Number(t.updated_contacts) || 0} />
                        <Chip label="complete" value={Number(t.contact_profiles_complete) || 0} />
                        <Chip label="readiness" value={Number(t.readiness_profiles_started) || 0} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

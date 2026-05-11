import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Users, UserPlus, RefreshCw, TrendingUp, CheckCircle2, ClipboardList } from "lucide-react";
import { useRacerReportsGuard } from "@/hooks/useRacerReportsGuard";

interface Report {
  id: string;
  slug: string;
  title: string;
  heading: string | null;
  subheading: string | null;
  summary_text: string;
  report_date: string;
  generated_at: string;
  totals: Record<string, number> | null;
  field_completion: Record<string, number> | null;
  status_counts: Record<string, Record<string, number>> | null;
  created_today_contacts: any[];
  new_contacts: any[];
  updated_contacts: any[];
  regressions: any[];
  missing_critical: any[];
  recent_contacts: any[];
  contacts: any[];
}

const fmt = (n?: number) =>
  typeof n === "number" ? new Intl.NumberFormat("en-US").format(n) : "0";

function fmtDate(s?: string | null) {
  if (!s) return "";
  const d = new Date(s + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function fmtDateTime(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleString();
}

function humanLabel(key: string) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function CountCard({
  label, value, Icon,
}: { label: string; value: number; Icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-2xl font-bold tabular-nums leading-none">{fmt(value)}</div>
            <div className="text-xs text-muted-foreground mt-1 uppercase tracking-wide">
              {label}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KeyCountTable({ data }: { data: Record<string, number> | null | undefined }) {
  const entries = Object.entries(data || {});
  if (!entries.length) {
    return <p className="text-sm text-muted-foreground">No data.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Field</TableHead>
          <TableHead className="text-right">Count</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map(([k, v]) => (
          <TableRow key={k}>
            <TableCell>{humanLabel(k)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmt(Number(v))}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function pickDisplay(c: any): { name: string; id?: string; email?: string; mobile?: string } {
  const name =
    c?.name || c?.full_name ||
    [c?.first_name, c?.last_name].filter(Boolean).join(" ") ||
    c?.contact_name || "—";
  return {
    name,
    id: c?.id || c?.contact_id || c?.salesforce_id || c?.sfdc_id,
    email: c?.email,
    mobile: c?.mobile || c?.phone || c?.mobile_phone,
  };
}

function ContactsTable({
  rows, showChangedFields = false, emptyText = "None.",
}: {
  rows: any[]; showChangedFields?: boolean; emptyText?: string;
}) {
  if (!rows || rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }
  const anyChanged = showChangedFields && rows.some((r) => r?.changed_fields);
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>ID</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Mobile</TableHead>
          {anyChanged && <TableHead>Changed</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c, i) => {
          const d = pickDisplay(c);
          const changed = Array.isArray(c?.changed_fields)
            ? c.changed_fields.join(", ")
            : (c?.changed_fields || "");
          return (
            <TableRow key={d.id || i}>
              <TableCell className="font-medium">{d.name}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {d.id || "—"}
              </TableCell>
              <TableCell className="text-sm">{d.email || "—"}</TableCell>
              <TableCell className="text-sm">{d.mobile || "—"}</TableCell>
              {anyChanged && (
                <TableCell className="text-xs text-muted-foreground">{changed || "—"}</TableCell>
              )}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function Section({
  title, description, children,
}: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function RacerContactReportDetail() {
  const blocked = useRacerReportsGuard();
  const { slug } = useParams<{ slug: string }>();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("racer_contact_reports")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (error) {
        setError(error.message);
      } else if (!data) {
        setError("Report not found.");
      } else {
        setReport(data as Report);
        document.title = `${(data as Report).heading || (data as Report).title} — World Moto Clash`;
      }
      setLoading(false);
    })();
  }, [slug]);

  if (blocked) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-10 max-w-6xl space-y-4">
          <Skeleton className="h-10 w-1/2" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-10 max-w-3xl">
          <Card className="border-destructive">
            <CardContent className="pt-6 text-sm text-destructive">
              {error || "Report not found."}
            </CardContent>
          </Card>
          <p className="mt-4">
            <Link to="/racer/reports" className="text-sm underline text-muted-foreground">
              ← Back to all reports
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const t = report.totals || {};
  const sc = report.status_counts || {};

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 max-w-6xl space-y-6">
        <div>
          <Link to="/racer/reports" className="text-sm text-muted-foreground hover:underline">
            ← All racer contact logs
          </Link>
        </div>

        <header>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            {report.heading || report.title}
          </h1>
          {report.subheading && (
            <p className="text-muted-foreground mt-2">{report.subheading}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Report date: {fmtDate(report.report_date)} · Generated{" "}
            {fmtDateTime(report.generated_at)}
          </p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <CountCard label="Total Contacts" value={Number(t.total_contacts) || 0} Icon={Users} />
          <CountCard label="Created Today" value={Number(t.created_today) || 0} Icon={UserPlus} />
          <CountCard label="New vs Previous" value={Number(t.new_vs_previous) || 0} Icon={TrendingUp} />
          <CountCard label="Updated" value={Number(t.updated_contacts) || 0} Icon={RefreshCw} />
          <CountCard label="Complete Profiles" value={Number(t.contact_profiles_complete) || 0} Icon={CheckCircle2} />
          <CountCard label="Readiness Started" value={Number(t.readiness_profiles_started) || 0} Icon={ClipboardList} />
        </div>

        <Section title="Summary">
          <p className="text-sm leading-relaxed whitespace-pre-line">{report.summary_text}</p>
        </Section>

        <Section title="Field Completion Snapshot">
          <KeyCountTable data={report.field_completion} />
        </Section>

        <Section title="Status Snapshot">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              ["Media Release Status", "media_release_status"],
              ["Racing License", "racing_license"],
              ["White Glove Scheduled", "white_glove_scheduled"],
              ["Scoring Compete", "scoring_compete"],
            ].map(([label, key]) => (
              <div key={key}>
                <h4 className="text-sm font-semibold mb-2">{label}</h4>
                <KeyCountTable data={sc?.[key] as Record<string, number> | undefined} />
              </div>
            ))}
          </div>
        </Section>

        <Section title="Contacts Created Today">
          <ContactsTable rows={report.created_today_contacts || []} emptyText="None today." />
        </Section>

        <Section title="New vs Previous Snapshot">
          <ContactsTable rows={report.new_contacts || []} emptyText="No new contacts." />
        </Section>

        <Section title="Recently Updated Contacts">
          <ContactsTable
            rows={report.updated_contacts || []}
            showChangedFields
            emptyText="No updates."
          />
        </Section>

        <Section title="Regressions">
          <ContactsTable rows={report.regressions || []} showChangedFields emptyText="None." />
        </Section>

        <Section title="Missing Critical Fields">
          <ContactsTable rows={report.missing_critical || []} emptyText="None." />
        </Section>

        <Section title="Newest Racer Contacts">
          <ContactsTable
            rows={(report.recent_contacts && report.recent_contacts.length
              ? report.recent_contacts
              : (report.contacts || []).slice(0, 25))}
            emptyText="None."
          />
        </Section>
      </div>
    </div>
  );
}

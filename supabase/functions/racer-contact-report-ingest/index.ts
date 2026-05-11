// Racer Contact Daily Log Report ingestion endpoint.
// Server-to-server only. Bearer-token auth. Idempotent by report_date.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const baseHeaders = { "Content-Type": "application/json" };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: baseHeaders });
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let m = 0;
  for (let i = 0; i < a.length; i++) m |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return m === 0;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

interface ValidationError { field: string; message: string }

function validate(payload: any):
  | { ok: true }
  | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, errors: [{ field: "(root)", message: "payload must be a JSON object" }] };
  }

  if (payload.report_type !== "racer_contact_report") {
    errors.push({ field: "report_type", message: 'report_type must be "racer_contact_report"' });
  }
  if (!payload.report_date || typeof payload.report_date !== "string" || !ISO_DATE_RE.test(payload.report_date)) {
    errors.push({ field: "report_date", message: "report_date must be YYYY-MM-DD" });
  }
  if (!payload.generated_at || typeof payload.generated_at !== "string" || isNaN(Date.parse(payload.generated_at))) {
    errors.push({ field: "generated_at", message: "generated_at must be ISO 8601" });
  }
  if (!payload.title || typeof payload.title !== "string" || !payload.title.trim()) {
    errors.push({ field: "title", message: "title is required" });
  }
  if (!payload.summary_text || typeof payload.summary_text !== "string" || !payload.summary_text.trim()) {
    errors.push({ field: "summary_text", message: "summary_text is required" });
  }

  if (!payload.totals || typeof payload.totals !== "object" || Array.isArray(payload.totals)) {
    errors.push({ field: "totals", message: "totals must be an object" });
  } else {
    for (const k of [
      "total_contacts","created_today","new_vs_previous","updated_contacts",
      "regressions","contact_profiles_complete","readiness_profiles_started",
    ]) {
      if (!isFiniteNumber(payload.totals[k])) {
        errors.push({ field: `totals.${k}`, message: `totals.${k} must be a finite number` });
      }
    }
  }

  for (const k of ["field_completion","status_counts"]) {
    if (payload[k] !== undefined && payload[k] !== null) {
      if (typeof payload[k] !== "object" || Array.isArray(payload[k])) {
        errors.push({ field: k, message: `${k} must be an object` });
      }
    }
  }

  for (const k of [
    "created_today_contacts","new_contacts","updated_contacts",
    "regressions","missing_critical","recent_contacts","contacts",
  ]) {
    if (payload[k] !== undefined && payload[k] !== null && !Array.isArray(payload[k])) {
      errors.push({ field: k, message: `${k} must be an array` });
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: baseHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const expected = Deno.env.get("RACER_CONTACT_REPORT_INGEST_TOKEN");
  if (!expected) {
    console.error("[racer-contact-ingest] RACER_CONTACT_REPORT_INGEST_TOKEN not configured");
    return json({ ok: false, error: "server_misconfigured" }, 500);
  }
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m || !safeEqual(m[1].trim(), expected)) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  let payload: any;
  try { payload = await req.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400); }

  const result = validate(payload);
  if (!result.ok) return json({ ok: false, error: "validation_failed", details: result.errors }, 400);

  const reportDate: string = payload.report_date;
  const slug = `racer-contact-daily-log-${reportDate}`;
  const reportId = `racer-contact-daily-${reportDate}`;
  const pageUrl = `https://mediahub.worldmotoclash.com/racer/reports/${slug}`;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { data: existing, error: selErr } = await supabase
    .from("racer_contact_reports")
    .select("id")
    .eq("report_date", reportDate)
    .maybeSingle();

  if (selErr) {
    console.error("[racer-contact-ingest] select error", selErr.message);
    return json({ ok: false, error: "db_error" }, 500);
  }
  const wasExisting = !!existing;

  const baseRow = {
    report_id: reportId,
    report_type: "racer_contact_report",
    slug,
    report_date: reportDate,
    title: String(payload.title).trim(),
    heading: payload.heading ?? null,
    subheading: payload.subheading ?? null,
    summary_text: String(payload.summary_text).trim(),
    generated_at: payload.generated_at,
    totals: payload.totals ?? {},
    field_completion: payload.field_completion ?? {},
    status_counts: payload.status_counts ?? {},
    created_today_contacts: payload.created_today_contacts ?? [],
    new_contacts: payload.new_contacts ?? [],
    updated_contacts: payload.updated_contacts ?? [],
    regressions: payload.regressions ?? [],
    missing_critical: payload.missing_critical ?? [],
    recent_contacts: payload.recent_contacts ?? [],
    contacts: payload.contacts ?? [],
    raw_payload: payload,
    page_url: pageUrl,
  };

  let upsertErr;
  if (wasExisting) {
    const { error } = await supabase
      .from("racer_contact_reports")
      .update(baseRow)
      .eq("report_date", reportDate);
    upsertErr = error;
  } else {
    const { error } = await supabase
      .from("racer_contact_reports")
      .insert({ ...baseRow, status: "published" });
    upsertErr = error;
  }

  if (upsertErr) {
    console.error("[racer-contact-ingest] upsert error", upsertErr.message);
    return json({ ok: false, error: "db_error", message: upsertErr.message }, 500);
  }

  console.log(JSON.stringify({
    event: "racer_contact_ingest",
    report_id: reportId,
    report_date: reportDate,
    created: !wasExisting,
    updated: wasExisting,
  }));

  return json({
    ok: true,
    slug,
    report_date: reportDate,
    url: pageUrl,
    created: !wasExisting,
    updated: wasExisting,
  }, 200);
});

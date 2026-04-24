// Social Performance Report Ingestion Endpoint
// Server-to-server only. Authenticated via static bearer token.
// POST JSON payload -> upserts a daily report row keyed by report date.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Server-to-server endpoint: no browser CORS allowance needed,
// but we still respond cleanly to OPTIONS to be polite.
const baseHeaders = {
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: baseHeaders });
}

// Constant-time string compare to avoid timing attacks on token check.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

interface ValidationError {
  field: string;
  message: string;
}

function validatePayload(payload: any): { ok: true; data: any } | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, errors: [{ field: "(root)", message: "payload must be a JSON object" }] };
  }

  // generated_at
  if (!payload.generated_at) {
    errors.push({ field: "generated_at", message: "generated_at is required" });
  } else if (typeof payload.generated_at !== "string" || isNaN(Date.parse(payload.generated_at))) {
    errors.push({ field: "generated_at", message: "generated_at must be an ISO 8601 datetime string" });
  }

  // since
  if (!payload.since) {
    errors.push({ field: "since", message: "since is required" });
  } else if (typeof payload.since !== "string" || isNaN(Date.parse(payload.since))) {
    errors.push({ field: "since", message: "since must be an ISO 8601 datetime string" });
  }

  // totals
  if (!payload.totals) {
    errors.push({ field: "totals", message: "totals is required" });
  } else if (typeof payload.totals !== "object" || Array.isArray(payload.totals)) {
    errors.push({ field: "totals", message: "totals must be an object" });
  } else {
    for (const key of ["posts", "views", "engagements", "clicks"]) {
      const v = payload.totals[key];
      if (v === undefined || v === null) {
        errors.push({ field: `totals.${key}`, message: `totals.${key} is required` });
      } else if (typeof v !== "number" || !Number.isFinite(v)) {
        errors.push({ field: `totals.${key}`, message: `totals.${key} must be a finite number` });
      }
    }
  }

  // platforms
  if (!payload.platforms) {
    errors.push({ field: "platforms", message: "platforms is required" });
  } else if (!Array.isArray(payload.platforms)) {
    errors.push({ field: "platforms", message: "platforms must be an array" });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: payload };
}

function formatTitleDate(d: Date): string {
  const m = MONTH_ABBR[d.getUTCMonth()];
  return `${m} ${String(d.getUTCDate()).padStart(2, "0")} ${d.getUTCFullYear()}`;
}

function isoDate(d: Date): string {
  // YYYY-MM-DD in UTC
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: baseHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  // --- Auth ---
  const expectedToken = Deno.env.get("MEDIAHUB_SOCIAL_REPORT_INGEST_TOKEN");
  if (!expectedToken) {
    console.error("[ingest] MEDIAHUB_SOCIAL_REPORT_INGEST_TOKEN not configured");
    return json({ ok: false, error: "server_misconfigured" }, 500);
  }

  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m || !safeEqual(m[1].trim(), expectedToken)) {
    console.warn("[ingest] unauthorized request");
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  // --- Parse JSON ---
  let payload: any;
  try {
    payload = await req.json();
  } catch (_e) {
    return json({ ok: false, error: "invalid_json" }, 400);
  }

  // --- Validate ---
  const result = validatePayload(payload);
  if (!result.ok) {
    return json({ ok: false, error: "validation_failed", details: result.errors }, 400);
  }

  // --- Derive fields ---
  const generatedAt = new Date(payload.generated_at);
  const reportDate = isoDate(generatedAt);
  const reportId = `social-performance-${reportDate}`;
  const slug = `social-performance-report-${reportDate}`;
  const title = `World Moto Clash Social Performance Report, ${formatTitleDate(generatedAt)}`;
  const pageUrl = `https://mediahub.worldmotoclash.com/reports/${slug}`;

  // --- DB client (service role bypasses RLS) ---
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Check existence to determine created vs updated
  const { data: existing, error: selErr } = await supabase
    .from("social_performance_reports")
    .select("id")
    .eq("report_id", reportId)
    .maybeSingle();

  if (selErr) {
    console.error("[ingest] select error", selErr.message);
    return json({ ok: false, error: "db_error" }, 500);
  }

  const wasExisting = !!existing;

  const row = {
    report_id: reportId,
    report_type: "social_performance",
    title,
    slug,
    report_date: reportDate,
    generated_at: payload.generated_at,
    since: payload.since,
    total_posts: Math.trunc(payload.totals.posts),
    total_views: Math.trunc(payload.totals.views),
    total_engagements: Math.trunc(payload.totals.engagements),
    total_clicks: Math.trunc(payload.totals.clicks),
    platforms: payload.platforms ?? [],
    top_overall: payload.top_overall ?? [],
    raw_payload: payload,
    page_url: pageUrl,
    // status is intentionally NOT set on update — preserves manual publish flips.
    // For new rows, DB default 'draft' applies.
  };

  let upsertErr;
  if (wasExisting) {
    const { error } = await supabase
      .from("social_performance_reports")
      .update(row)
      .eq("report_id", reportId);
    upsertErr = error;
  } else {
    const { error } = await supabase
      .from("social_performance_reports")
      .insert(row);
    upsertErr = error;
  }

  if (upsertErr) {
    console.error("[ingest] upsert error", upsertErr.message);
    return json({ ok: false, error: "db_error", message: upsertErr.message }, 500);
  }

  console.log(JSON.stringify({
    event: "ingest",
    report_id: reportId,
    report_date: reportDate,
    created: !wasExisting,
    updated: wasExisting,
  }));

  return json({
    ok: true,
    reportId,
    created: !wasExisting,
    updated: wasExisting,
    url: pageUrl,
  }, 200);
});

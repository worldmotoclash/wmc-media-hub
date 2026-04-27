// Media Hub Content Report Ingestion Endpoint
// Server-to-server only. Authenticated via static bearer token.
// POST JSON payload -> upserts a daily OR weekly Media Hub content-upload
// report row keyed by {period_type, report_date / ISO week}.
//
// This endpoint is *separate* from social-performance-ingest. It powers the
// Media Hub "all uploaded content" daily/weekly reports rendered at:
//   /content-reports/daily/:slug
//   /content-reports/weekly/:slug

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function validatePayload(
  payload: any,
): { ok: true; data: any } | { ok: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {
      ok: false,
      errors: [{ field: "(root)", message: "payload must be a JSON object" }],
    };
  }

  // report_type
  if (!payload.report_type) {
    errors.push({ field: "report_type", message: "report_type is required" });
  } else if (payload.report_type !== "mediahub_content_report") {
    errors.push({
      field: "report_type",
      message: 'report_type must be "mediahub_content_report"',
    });
  }

  // period_type
  if (!payload.period_type) {
    errors.push({ field: "period_type", message: "period_type is required" });
  } else if (payload.period_type !== "daily" && payload.period_type !== "weekly") {
    errors.push({
      field: "period_type",
      message: "period_type must be daily or weekly",
    });
  }

  // generated_at
  if (!payload.generated_at) {
    errors.push({ field: "generated_at", message: "generated_at is required" });
  } else if (
    typeof payload.generated_at !== "string" ||
    isNaN(Date.parse(payload.generated_at))
  ) {
    errors.push({
      field: "generated_at",
      message: "generated_at must be an ISO 8601 datetime string",
    });
  }

  // report_date
  if (!payload.report_date) {
    errors.push({ field: "report_date", message: "report_date is required" });
  } else if (
    typeof payload.report_date !== "string" ||
    !ISO_DATE_RE.test(payload.report_date) ||
    isNaN(Date.parse(payload.report_date))
  ) {
    errors.push({
      field: "report_date",
      message: "report_date must be a YYYY-MM-DD date string",
    });
  }

  // title
  if (!payload.title || typeof payload.title !== "string" || !payload.title.trim()) {
    errors.push({ field: "title", message: "title is required" });
  }

  // summary_text
  if (
    !payload.summary_text ||
    typeof payload.summary_text !== "string" ||
    !payload.summary_text.trim()
  ) {
    errors.push({ field: "summary_text", message: "summary_text is required" });
  }

  // asset_counts
  if (!payload.asset_counts) {
    errors.push({ field: "asset_counts", message: "asset_counts is required" });
  } else if (
    typeof payload.asset_counts !== "object" ||
    Array.isArray(payload.asset_counts)
  ) {
    errors.push({
      field: "asset_counts",
      message: "asset_counts must be an object",
    });
  } else {
    for (const k of ["videos", "images", "audio", "other", "total"]) {
      const v = payload.asset_counts[k];
      if (v === undefined || v === null) {
        errors.push({
          field: `asset_counts.${k}`,
          message: `asset_counts.${k} is required`,
        });
      } else if (!isFiniteNumber(v)) {
        errors.push({
          field: `asset_counts.${k}`,
          message: `asset_counts.${k} must be a finite number`,
        });
      }
    }
  }

  // assets
  if (payload.assets === undefined || payload.assets === null) {
    errors.push({ field: "assets", message: "assets is required" });
  } else if (!Array.isArray(payload.assets)) {
    errors.push({ field: "assets", message: "assets must be an array" });
  }

  // Weekly-only: day_breakdown is optional but must be an array if present
  if (
    payload.period_type === "weekly" &&
    payload.day_breakdown !== undefined &&
    payload.day_breakdown !== null &&
    !Array.isArray(payload.day_breakdown)
  ) {
    errors.push({
      field: "day_breakdown",
      message: "day_breakdown must be an array",
    });
  }

  // period_start / period_end (optional but if present must be valid YYYY-MM-DD)
  for (const f of ["period_start", "period_end"]) {
    const v = payload[f];
    if (v !== undefined && v !== null && v !== "") {
      if (typeof v !== "string" || !ISO_DATE_RE.test(v)) {
        errors.push({ field: f, message: `${f} must be a YYYY-MM-DD date string` });
      }
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: payload };
}

// ISO 8601 week number (Mon–Sun, week containing first Thursday).
// Returns { year, week } where year is the ISO-week-numbering year.
function isoWeek(dateStr: string): { year: number; week: number } {
  // Parse as UTC noon to dodge DST edges.
  const d = new Date(dateStr + "T12:00:00Z");
  const target = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
  // Day number 1..7, Mon=1
  const dayNum = (target.getUTCDay() + 6) % 7 + 1;
  // Move target to the Thursday of this ISO week
  target.setUTCDate(target.getUTCDate() - dayNum + 4);
  const isoYear = target.getUTCFullYear();
  // Jan 4 is always in ISO week 1
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const diffDays = Math.round((target.getTime() - jan4.getTime()) / 86400000);
  const week = 1 + Math.floor(diffDays / 7);
  return { year: isoYear, week };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: baseHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "method_not_allowed" }, 405);
  }

  // --- Auth ---
  const expectedToken = Deno.env.get("MEDIAHUB_CONTENT_REPORT_INGEST_TOKEN");
  if (!expectedToken) {
    console.error(
      "[mediahub-content-ingest] MEDIAHUB_CONTENT_REPORT_INGEST_TOKEN not configured",
    );
    return json({ ok: false, error: "server_misconfigured" }, 500);
  }

  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m || !safeEqual(m[1].trim(), expectedToken)) {
    console.warn("[mediahub-content-ingest] unauthorized request");
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
    return json(
      { ok: false, error: "validation_failed", details: result.errors },
      400,
    );
  }

  // --- Derive slug + report_id ---
  const periodType: "daily" | "weekly" = payload.period_type;
  const reportDate: string = payload.report_date;

  let slug: string;
  let reportId: string;
  let routeSegment: "daily" | "weekly";

  if (periodType === "daily") {
    routeSegment = "daily";
    slug = `mediahub-daily-report-${reportDate}`;
    reportId = `mediahub-daily-${reportDate}`;
  } else {
    routeSegment = "weekly";
    const { year, week } = isoWeek(reportDate);
    slug = `mediahub-weekly-report-${year}-week-${pad2(week)}`;
    reportId = `mediahub-weekly-${year}-week-${pad2(week)}`;
  }

  const pageUrl = `https://mediahub.worldmotoclash.com/content-reports/${routeSegment}/${slug}`;

  // --- DB client (service role bypasses RLS) ---
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Check existence to determine created vs updated
  const { data: existing, error: selErr } = await supabase
    .from("mediahub_content_reports")
    .select("id")
    .eq("report_id", reportId)
    .maybeSingle();

  if (selErr) {
    console.error("[mediahub-content-ingest] select error", selErr.message);
    return json({ ok: false, error: "db_error" }, 500);
  }

  const wasExisting = !!existing;

  const baseRow = {
    report_id: reportId,
    report_type: "mediahub_content_report",
    period_type: periodType,
    title: String(payload.title).trim(),
    slug,
    report_date: reportDate,
    period_start: payload.period_start || null,
    period_end: payload.period_end || null,
    heading: payload.heading ?? null,
    subheading: payload.subheading ?? null,
    summary_text: String(payload.summary_text).trim(),
    asset_counts: payload.asset_counts,
    assets: payload.assets ?? [],
    day_breakdown: payload.day_breakdown ?? null,
    generated_at: payload.generated_at,
    raw_payload: payload,
    page_url: pageUrl,
  };

  let upsertErr;
  if (wasExisting) {
    // On re-ingest, do NOT touch status — preserves any manual flip
    // (e.g. an admin unpublishing a bad report stays unpublished).
    const { error } = await supabase
      .from("mediahub_content_reports")
      .update(baseRow)
      .eq("report_id", reportId);
    upsertErr = error;
  } else {
    // New reports auto-publish so the returned page_url works immediately.
    const { error } = await supabase
      .from("mediahub_content_reports")
      .insert({ ...baseRow, status: "published" });
    upsertErr = error;
  }

  if (upsertErr) {
    console.error("[mediahub-content-ingest] upsert error", upsertErr.message);
    return json(
      { ok: false, error: "db_error", message: upsertErr.message },
      500,
    );
  }

  console.log(
    JSON.stringify({
      event: "mediahub_content_ingest",
      report_id: reportId,
      period_type: periodType,
      report_date: reportDate,
      created: !wasExisting,
      updated: wasExisting,
    }),
  );

  return json(
    {
      ok: true,
      reportId,
      created: !wasExisting,
      updated: wasExisting,
      url: pageUrl,
    },
    200,
  );
});

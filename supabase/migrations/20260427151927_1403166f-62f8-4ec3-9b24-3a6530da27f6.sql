-- Media Hub content-upload reports (daily + weekly), separate from social_performance_reports
CREATE TABLE public.mediahub_content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id text NOT NULL UNIQUE,
  report_type text NOT NULL DEFAULT 'mediahub_content_report',
  period_type text NOT NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  report_date date NOT NULL,
  period_start date,
  period_end date,
  heading text,
  subheading text,
  summary_text text NOT NULL,
  asset_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  assets jsonb NOT NULL DEFAULT '[]'::jsonb,
  day_breakdown jsonb,
  generated_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  page_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mediahub_content_reports_period_type_chk
    CHECK (period_type IN ('daily', 'weekly')),
  CONSTRAINT mediahub_content_reports_status_chk
    CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE INDEX idx_mediahub_content_reports_period_date
  ON public.mediahub_content_reports (period_type, report_date DESC);

CREATE INDEX idx_mediahub_content_reports_status
  ON public.mediahub_content_reports (status);

ALTER TABLE public.mediahub_content_reports ENABLE ROW LEVEL SECURITY;

-- Public can read only published reports. All writes go through the
-- mediahub-content-report-ingest edge function using the service role.
CREATE POLICY "Published mediahub content reports are viewable by everyone"
ON public.mediahub_content_reports
FOR SELECT
USING (status = 'published');

-- updated_at trigger using existing helper
CREATE TRIGGER trg_mediahub_content_reports_updated_at
BEFORE UPDATE ON public.mediahub_content_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
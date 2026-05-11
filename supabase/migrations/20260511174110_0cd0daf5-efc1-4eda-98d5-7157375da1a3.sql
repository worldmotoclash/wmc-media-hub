CREATE TABLE public.racer_contact_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id text NOT NULL UNIQUE,
  report_type text NOT NULL DEFAULT 'racer_contact_report',
  slug text NOT NULL UNIQUE,
  report_date date NOT NULL UNIQUE,
  title text NOT NULL,
  heading text,
  subheading text,
  summary_text text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  generated_at timestamptz NOT NULL,
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  field_completion jsonb NOT NULL DEFAULT '{}'::jsonb,
  status_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_today_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  new_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  regressions jsonb NOT NULL DEFAULT '[]'::jsonb,
  missing_critical jsonb NOT NULL DEFAULT '[]'::jsonb,
  recent_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  page_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_racer_contact_reports_date ON public.racer_contact_reports (report_date DESC);

ALTER TABLE public.racer_contact_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published racer contact reports are viewable by everyone"
ON public.racer_contact_reports
FOR SELECT
USING (status = 'published');

CREATE TRIGGER update_racer_contact_reports_updated_at
BEFORE UPDATE ON public.racer_contact_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
-- Create social performance reports table
CREATE TABLE public.social_performance_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id TEXT NOT NULL UNIQUE,
  report_type TEXT NOT NULL DEFAULT 'social_performance',
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  report_date DATE NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  since TIMESTAMPTZ NOT NULL,
  total_posts INTEGER NOT NULL DEFAULT 0,
  total_views BIGINT NOT NULL DEFAULT 0,
  total_engagements BIGINT NOT NULL DEFAULT 0,
  total_clicks BIGINT NOT NULL DEFAULT 0,
  platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
  top_overall JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  page_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_spr_report_date ON public.social_performance_reports (report_date DESC);
CREATE INDEX idx_spr_status ON public.social_performance_reports (status);
CREATE INDEX idx_spr_slug ON public.social_performance_reports (slug);

-- Enable RLS
ALTER TABLE public.social_performance_reports ENABLE ROW LEVEL SECURITY;

-- Public can view ONLY published reports
CREATE POLICY "Published reports are viewable by everyone"
ON public.social_performance_reports
FOR SELECT
USING (status = 'published');

-- No public INSERT/UPDATE/DELETE policies — writes only via edge function (service role bypasses RLS)

-- Updated_at trigger using existing function
CREATE TRIGGER update_social_performance_reports_updated_at
BEFORE UPDATE ON public.social_performance_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.social_performance_reports
  ADD COLUMN IF NOT EXISTS total_shares BIGINT NOT NULL DEFAULT 0;
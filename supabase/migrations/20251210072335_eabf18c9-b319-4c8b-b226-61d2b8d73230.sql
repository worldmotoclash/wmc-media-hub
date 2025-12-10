-- Create the social_kit_jobs table for tracking social kit generation
CREATE TABLE public.social_kit_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  master_asset_id text NOT NULL,
  user_id text NOT NULL DEFAULT 'anonymous',
  status text NOT NULL DEFAULT 'pending',
  selected_model text NOT NULL DEFAULT 'native_resize',
  total_variants integer NOT NULL DEFAULT 0,
  completed_variants integer NOT NULL DEFAULT 0,
  failed_variants integer NOT NULL DEFAULT 0,
  variants jsonb NOT NULL DEFAULT '[]'::jsonb,
  salesforce_master_id text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_kit_jobs ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Social kit jobs are viewable by everyone"
  ON public.social_kit_jobs FOR SELECT USING (true);

-- Allow authenticated users to insert
CREATE POLICY "Authenticated users can create social kit jobs"
  ON public.social_kit_jobs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to update
CREATE POLICY "Authenticated users can update social kit jobs"
  ON public.social_kit_jobs FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Add updated_at trigger
CREATE TRIGGER update_social_kit_jobs_updated_at
  BEFORE UPDATE ON public.social_kit_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
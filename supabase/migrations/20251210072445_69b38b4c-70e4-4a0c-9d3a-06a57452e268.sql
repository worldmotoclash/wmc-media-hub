-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Authenticated users can create social kit jobs" ON public.social_kit_jobs;

-- Create a more permissive insert policy (like media_assets)
CREATE POLICY "Anyone can create social kit jobs"
  ON public.social_kit_jobs FOR INSERT WITH CHECK (true);

-- Also update the update policy to be more permissive
DROP POLICY IF EXISTS "Authenticated users can update social kit jobs" ON public.social_kit_jobs;

CREATE POLICY "Anyone can update social kit jobs"
  ON public.social_kit_jobs FOR UPDATE USING (true);
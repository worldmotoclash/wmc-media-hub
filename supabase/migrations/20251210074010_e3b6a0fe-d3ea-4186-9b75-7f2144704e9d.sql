-- Add DELETE policy for media_assets table
CREATE POLICY "Authenticated users can delete media assets" 
ON public.media_assets 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Add DELETE policy for social_kit_jobs table
CREATE POLICY "Authenticated users can delete social kit jobs" 
ON public.social_kit_jobs 
FOR DELETE 
USING (auth.uid() IS NOT NULL);
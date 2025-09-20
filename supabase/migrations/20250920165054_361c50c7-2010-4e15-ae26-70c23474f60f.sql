-- Fix RLS policies for video_scene_detections table
-- The INSERT policy should check that created_by is set to the current user

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can create scene detections" ON public.video_scene_detections;
DROP POLICY IF EXISTS "Authenticated users can update scene detections" ON public.video_scene_detections;

-- Create new policies that properly handle user authentication
CREATE POLICY "Authenticated users can create their own scene detections" 
ON public.video_scene_detections 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Authenticated users can update their own scene detections" 
ON public.video_scene_detections 
FOR UPDATE 
USING (auth.uid() IS NOT NULL AND created_by = auth.uid());

-- Also make created_by NOT NULL since it should always be set
ALTER TABLE public.video_scene_detections 
ALTER COLUMN created_by SET NOT NULL,
ALTER COLUMN created_by SET DEFAULT auth.uid();
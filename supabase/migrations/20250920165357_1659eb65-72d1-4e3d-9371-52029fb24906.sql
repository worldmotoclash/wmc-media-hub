-- Update RLS policies to work with auth.uid() default value
-- First drop the existing policies
DROP POLICY IF EXISTS "Authenticated users can create their own scene detections" ON public.video_scene_detections;
DROP POLICY IF EXISTS "Authenticated users can update their own scene detections" ON public.video_scene_detections;

-- Create simpler policies that just check authentication
CREATE POLICY "Authenticated users can create scene detections" 
ON public.video_scene_detections 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update scene detections" 
ON public.video_scene_detections 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);
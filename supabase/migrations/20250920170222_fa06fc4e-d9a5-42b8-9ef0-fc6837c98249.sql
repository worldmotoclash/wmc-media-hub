-- Fix the created_by column constraint issue
-- Make created_by nullable since we're using service role
ALTER TABLE public.video_scene_detections 
ALTER COLUMN created_by DROP NOT NULL;
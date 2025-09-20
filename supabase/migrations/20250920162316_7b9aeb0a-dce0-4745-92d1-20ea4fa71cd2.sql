-- Create table for storing video scene detection results
CREATE TABLE public.video_scene_detections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_asset_id UUID REFERENCES public.media_assets(id),
  threshold NUMERIC NOT NULL DEFAULT 30.0,
  total_scenes INTEGER NOT NULL DEFAULT 0,
  video_duration NUMERIC,
  processing_status TEXT NOT NULL DEFAULT 'pending',
  results JSONB DEFAULT '{}',
  error_message TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS
ALTER TABLE public.video_scene_detections ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Scene detections are viewable by everyone" 
ON public.video_scene_detections 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create scene detections" 
ON public.video_scene_detections 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update scene detections" 
ON public.video_scene_detections 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_video_scene_detections_updated_at
BEFORE UPDATE ON public.video_scene_detections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for better performance
CREATE INDEX idx_video_scene_detections_media_asset_id ON public.video_scene_detections(media_asset_id);
CREATE INDEX idx_video_scene_detections_status ON public.video_scene_detections(processing_status);
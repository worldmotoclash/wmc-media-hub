-- Create video_generations table to track VEO generation jobs
CREATE TABLE public.video_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  salesforce_record_id TEXT,
  google_operation_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'generating', 'completed', 'failed')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  generation_data JSONB NOT NULL,
  video_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user access
CREATE POLICY "Users can view their own video generations" 
ON public.video_generations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own video generations" 
ON public.video_generations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video generations" 
ON public.video_generations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own video generations" 
ON public.video_generations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_video_generations_updated_at
BEFORE UPDATE ON public.video_generations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for generated videos
INSERT INTO storage.buckets (id, name, public) VALUES ('generated-videos', 'generated-videos', true);

-- Create storage policies for video uploads
CREATE POLICY "Users can view their own generated videos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'generated-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own generated videos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'generated-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Enable realtime for video_generations table
ALTER TABLE public.video_generations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_generations;
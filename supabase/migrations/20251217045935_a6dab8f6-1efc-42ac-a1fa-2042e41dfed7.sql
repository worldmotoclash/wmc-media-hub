-- Create image_generations table
CREATE TABLE public.image_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  error_message TEXT,
  prompt TEXT NOT NULL,
  template TEXT,
  reference_image_url TEXT,
  generation_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.image_generations ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own image generations" 
ON public.image_generations 
FOR SELECT 
USING (user_id = (auth.uid())::text);

CREATE POLICY "Users can create their own image generations" 
ON public.image_generations 
FOR INSERT 
WITH CHECK (user_id = (auth.uid())::text);

CREATE POLICY "Users can update their own image generations" 
ON public.image_generations 
FOR UPDATE 
USING (user_id = (auth.uid())::text);

CREATE POLICY "Users can delete their own image generations" 
ON public.image_generations 
FOR DELETE 
USING (user_id = (auth.uid())::text);

-- Service role policy for edge functions
CREATE POLICY "Service role can manage all image generations"
ON public.image_generations
FOR ALL
USING (true)
WITH CHECK (true);
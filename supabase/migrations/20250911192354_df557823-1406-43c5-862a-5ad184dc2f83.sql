-- Enable Row Level Security on video_generations table
ALTER TABLE public.video_generations ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view their own video generations
CREATE POLICY "Users can view their own video generations" 
ON public.video_generations 
FOR SELECT 
USING (user_id = auth.uid()::text);

-- Create policy for users to insert their own video generations
CREATE POLICY "Users can create their own video generations" 
ON public.video_generations 
FOR INSERT 
WITH CHECK (user_id = auth.uid()::text);

-- Create policy for users to update their own video generations
CREATE POLICY "Users can update their own video generations" 
ON public.video_generations 
FOR UPDATE 
USING (user_id = auth.uid()::text);

-- Create policy for users to delete their own video generations
CREATE POLICY "Users can delete their own video generations" 
ON public.video_generations 
FOR DELETE 
USING (user_id = auth.uid()::text);
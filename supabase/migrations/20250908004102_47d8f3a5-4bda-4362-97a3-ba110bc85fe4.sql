-- First, drop all existing RLS policies that reference the user_id column
DROP POLICY IF EXISTS "Users can create their own video generations" ON public.video_generations;
DROP POLICY IF EXISTS "Users can view their own video generations" ON public.video_generations;  
DROP POLICY IF EXISTS "Users can update their own video generations" ON public.video_generations;
DROP POLICY IF EXISTS "Users can delete their own video generations" ON public.video_generations;

-- Now we can safely change the column type from UUID to TEXT
ALTER TABLE public.video_generations ALTER COLUMN user_id TYPE TEXT;

-- Disable RLS since we're using custom authentication
-- In production, you might want to implement custom RLS policies that work with your auth system
ALTER TABLE public.video_generations DISABLE ROW LEVEL SECURITY;
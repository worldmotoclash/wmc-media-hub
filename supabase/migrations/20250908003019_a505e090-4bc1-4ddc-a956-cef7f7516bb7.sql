-- Change user_id column from UUID to TEXT to support Salesforce IDs
ALTER TABLE public.video_generations ALTER COLUMN user_id TYPE TEXT;

-- Drop existing RLS policies that rely on auth.uid()
DROP POLICY "Users can create their own video generations" ON public.video_generations;
DROP POLICY "Users can view their own video generations" ON public.video_generations;
DROP POLICY "Users can update their own video generations" ON public.video_generations;
DROP POLICY "Users can delete their own video generations" ON public.video_generations;

-- Since we're using custom authentication, we'll disable RLS for now
-- In a production environment, you might want to create a security definer function
-- that validates the user ID against your custom authentication system
ALTER TABLE public.video_generations DISABLE ROW LEVEL SECURITY;
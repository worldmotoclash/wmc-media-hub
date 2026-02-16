
-- Create media_albums table
CREATE TABLE public.media_albums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  asset_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_albums ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Albums are viewable by everyone"
  ON public.media_albums FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create albums"
  ON public.media_albums FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update albums"
  ON public.media_albums FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete albums"
  ON public.media_albums FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Trigger for updated_at
CREATE TRIGGER update_media_albums_updated_at
  BEFORE UPDATE ON public.media_albums
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add album_id column to media_assets
ALTER TABLE public.media_assets
  ADD COLUMN album_id UUID REFERENCES public.media_albums(id);

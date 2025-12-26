-- Create character_library table for storing reusable character/object/scene references
CREATE TABLE public.character_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  element_type TEXT NOT NULL CHECK (element_type IN ('character', 'vehicle', 'object', 'scene', 'group')),
  image_url TEXT NOT NULL,
  thumbnail_url TEXT,
  source_asset_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  style_profile JSONB DEFAULT '{}',
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.character_library ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Character library is viewable by everyone" 
ON public.character_library 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert characters" 
ON public.character_library 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own characters" 
ON public.character_library 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own characters" 
ON public.character_library 
FOR DELETE 
USING (auth.uid() = created_by);

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_character_library_updated_at
BEFORE UPDATE ON public.character_library
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
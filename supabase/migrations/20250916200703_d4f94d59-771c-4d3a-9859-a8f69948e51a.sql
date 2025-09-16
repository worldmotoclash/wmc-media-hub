-- Create media sources enum
CREATE TYPE media_source AS ENUM ('salesforce', 's3_bucket', 'youtube', 'generated', 'local_upload');

-- Create media assets table to catalog all video content
CREATE TABLE public.media_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  source media_source NOT NULL,
  source_id TEXT, -- External ID from source system
  file_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER, -- in seconds
  file_size BIGINT, -- in bytes
  resolution TEXT, -- e.g., "1920x1080"
  file_format TEXT, -- e.g., "mp4", "mov"
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Create S3 bucket configurations table
CREATE TABLE public.s3_bucket_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  bucket_name TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  access_key_id TEXT NOT NULL,
  region TEXT DEFAULT 'us-east-1',
  is_active BOOLEAN DEFAULT true,
  last_scanned_at TIMESTAMP WITH TIME ZONE,
  scan_frequency_hours INTEGER DEFAULT 24,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create tags table
CREATE TABLE public.media_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create media asset tags relationship table
CREATE TABLE public.media_asset_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_asset_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.media_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(media_asset_id, tag_id)
);

-- Create content review activities table
CREATE TABLE public.content_review_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  media_asset_id UUID NOT NULL REFERENCES public.media_assets(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'discovered', 'reviewed', 'approved', 'rejected', 'tagged', 'linked_to_sfdc'
  details JSONB DEFAULT '{}',
  performed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.s3_bucket_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_asset_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_review_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for media assets (allow read access, restrict write to authenticated users)
CREATE POLICY "Media assets are viewable by everyone" 
ON public.media_assets 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert media assets" 
ON public.media_assets 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update media assets" 
ON public.media_assets 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Create RLS policies for S3 bucket configs (admin only)
CREATE POLICY "S3 bucket configs are viewable by authenticated users" 
ON public.s3_bucket_configs 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can manage S3 bucket configs" 
ON public.s3_bucket_configs 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create RLS policies for tags (allow read access, restrict write to authenticated users)
CREATE POLICY "Media tags are viewable by everyone" 
ON public.media_tags 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage media tags" 
ON public.media_tags 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create RLS policies for media asset tags
CREATE POLICY "Media asset tags are viewable by everyone" 
ON public.media_asset_tags 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can manage media asset tags" 
ON public.media_asset_tags 
FOR ALL 
USING (auth.uid() IS NOT NULL);

-- Create RLS policies for content review activities
CREATE POLICY "Content review activities are viewable by everyone" 
ON public.content_review_activities 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert content review activities" 
ON public.content_review_activities 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX idx_media_assets_source ON public.media_assets(source);
CREATE INDEX idx_media_assets_status ON public.media_assets(status);
CREATE INDEX idx_media_assets_created_at ON public.media_assets(created_at DESC);
CREATE INDEX idx_media_assets_source_id ON public.media_assets(source, source_id);
CREATE INDEX idx_media_asset_tags_media_asset_id ON public.media_asset_tags(media_asset_id);
CREATE INDEX idx_media_asset_tags_tag_id ON public.media_asset_tags(tag_id);
CREATE INDEX idx_content_review_activities_media_asset_id ON public.content_review_activities(media_asset_id);
CREATE INDEX idx_content_review_activities_created_at ON public.content_review_activities(created_at DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_media_assets_updated_at
BEFORE UPDATE ON public.media_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_s3_bucket_configs_updated_at
BEFORE UPDATE ON public.s3_bucket_configs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default tags
INSERT INTO public.media_tags (name, description, color) VALUES
('Racing', 'Motor racing content', '#ef4444'),
('Interview', 'Interview content', '#3b82f6'),
('Behind the Scenes', 'Behind the scenes footage', '#10b981'),
('Training', 'Training and educational content', '#f59e0b'),
('Promotional', 'Marketing and promotional content', '#8b5cf6'),
('Archive', 'Historical archive content', '#6b7280');
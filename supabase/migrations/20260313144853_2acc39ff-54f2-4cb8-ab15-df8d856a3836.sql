-- Fix RLS policies for media_assets (match media_albums pattern)
DROP POLICY IF EXISTS "Authenticated users can insert media assets" ON media_assets;
DROP POLICY IF EXISTS "Authenticated users can update media assets" ON media_assets;
DROP POLICY IF EXISTS "Authenticated users can delete media assets" ON media_assets;

CREATE POLICY "Anyone can insert media assets" ON media_assets FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update media assets" ON media_assets FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete media assets" ON media_assets FOR DELETE TO anon, authenticated USING (true);

-- Fix RLS policies for media_asset_tags
DROP POLICY IF EXISTS "Authenticated users can manage media asset tags" ON media_asset_tags;
CREATE POLICY "Anyone can manage media asset tags" ON media_asset_tags FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Fix RLS policies for media_tags
DROP POLICY IF EXISTS "Authenticated users can manage media tags" ON media_tags;
CREATE POLICY "Anyone can manage media tags" ON media_tags FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
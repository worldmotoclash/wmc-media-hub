DROP POLICY IF EXISTS "Authenticated users can create albums" ON media_albums;
DROP POLICY IF EXISTS "Authenticated users can update albums" ON media_albums;
DROP POLICY IF EXISTS "Authenticated users can delete albums" ON media_albums;

CREATE POLICY "Anyone can create albums" ON media_albums FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update albums" ON media_albums FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete albums" ON media_albums FOR DELETE USING (true);
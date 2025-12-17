-- Create storage bucket for generation input images
INSERT INTO storage.buckets (id, name, public)
VALUES ('generation-inputs', 'generation-inputs', true);

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload generation inputs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'generation-inputs' AND auth.uid() IS NOT NULL);

-- Allow public read access
CREATE POLICY "Generation inputs are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'generation-inputs');

-- Allow users to delete their uploads
CREATE POLICY "Authenticated users can delete generation inputs"
ON storage.objects FOR DELETE
USING (bucket_id = 'generation-inputs' AND auth.uid() IS NOT NULL);
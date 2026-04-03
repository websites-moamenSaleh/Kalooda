
-- Create public products bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'products',
  'products',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
);

-- Allow public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

-- Allow authenticated uploads (admin)
CREATE POLICY "Authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'products');

-- Allow authenticated updates/deletes
CREATE POLICY "Authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'products');

CREATE POLICY "Authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'products');

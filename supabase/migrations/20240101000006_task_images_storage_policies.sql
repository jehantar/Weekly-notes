-- Storage RLS policies for task-images bucket
CREATE POLICY "Users can upload task images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'task-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read task images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'task-images');

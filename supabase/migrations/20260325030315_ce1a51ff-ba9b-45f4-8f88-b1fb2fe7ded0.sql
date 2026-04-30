CREATE POLICY "Users can update own draft media" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'draft-media' AND (storage.foldername(name))[1] = auth.uid()::text);
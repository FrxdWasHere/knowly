CREATE POLICY "Users read their own wallpapers"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'wallpapers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload their own wallpapers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'wallpapers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update their own wallpapers"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'wallpapers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete their own wallpapers"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'wallpapers' AND auth.uid()::text = (storage.foldername(name))[1]);
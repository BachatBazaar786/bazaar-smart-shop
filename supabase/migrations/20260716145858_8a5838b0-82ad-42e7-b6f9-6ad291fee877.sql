DROP POLICY IF EXISTS media_public_read ON storage.objects;
CREATE POLICY product_images_public_read ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY media_admin_read ON storage.objects FOR SELECT USING (bucket_id = 'media' AND public.is_admin(auth.uid()));
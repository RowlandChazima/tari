-- Step 2c-ii Migration: Product Images Hardening & Storage Admin SELECT Policy

-- 1. Ensure storage_path is unique in product_images to prevent duplicate associations
ALTER TABLE public.product_images
  ADD CONSTRAINT product_images_storage_path_key UNIQUE (storage_path);

-- 2. Admin-only SELECT policy on storage.objects for product-media
-- Allows verified admins to inspect and list storage objects (e.g. for orphan cleanup and upload verification)
-- while public access to images continues through Supabase public bucket URLs.
CREATE POLICY "Only verified admins can select product-media storage objects"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'product-media'
    AND EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = (SELECT auth.uid()))
  );


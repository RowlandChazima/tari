-- Supabase pgTAP RLS Test Suite for Tari Slice 2 Schema
-- Tests RLS enforcement across anon, non-admin authenticated, and verified admin users.

BEGIN;
SELECT plan(28);

-- 1. Verify RLS is enabled on all sensitive tables
SELECT row_eq(
  $$ SELECT relrowsecurity FROM pg_class WHERE relname = 'admins' AND relnamespace = 'public'::regnamespace $$,
  ROW(true),
  'Row Level Security must be enabled on public.admins'
);

SELECT row_eq(
  $$ SELECT relrowsecurity FROM pg_class WHERE relname = 'products' AND relnamespace = 'public'::regnamespace $$,
  ROW(true),
  'Row Level Security must be enabled on public.products'
);

SELECT row_eq(
  $$ SELECT relrowsecurity FROM pg_class WHERE relname = 'slug_history' AND relnamespace = 'public'::regnamespace $$,
  ROW(true),
  'Row Level Security must be enabled on public.slug_history'
);

SELECT row_eq(
  $$ SELECT relrowsecurity FROM pg_class WHERE relname = 'product_images' AND relnamespace = 'public'::regnamespace $$,
  ROW(true),
  'Row Level Security must be enabled on public.product_images'
);

-- 2. Setup Test Fixture Data inside Transaction
DO $$
DECLARE
  v_admin_id UUID := '11111111-1111-1111-1111-111111111111';
  v_customer_id UUID := '22222222-2222-2222-2222-222222222222';
BEGIN
  -- Insert dummy users in auth.users if not present
  INSERT INTO auth.users (id, email)
  VALUES 
    (v_admin_id, 'owner@tari.test'),
    (v_customer_id, 'customer@tari.test')
  ON CONFLICT (id) DO NOTHING;

  -- Register admin in public.admins
  INSERT INTO public.admins (user_id, role)
  VALUES (v_admin_id, 'owner')
  ON CONFLICT (user_id) DO NOTHING;

  -- Insert test products across all 3 statuses
  INSERT INTO public.products (
    id, slug, sku, name, price_kes, width_cm, drop_cm, material_name, color_name, color_hex, status, stock_status
  ) VALUES 
    ('33333333-3333-3333-3333-333333333331', 'test-published-curtain', 'SKU-PUB-01', 'Published Drape', 5000, 200, 250, 'Linen', 'Sand', '#C29B72', 'published', 'in_stock'),
    ('33333333-3333-3333-3333-333333333332', 'test-archived-curtain', 'SKU-ARC-01', 'Archived Drape', 4500, 180, 240, 'Cotton', 'Charcoal', '#333333', 'archived', 'out_of_stock'),
    ('33333333-3333-3333-3333-333333333333', 'test-draft-curtain', 'SKU-DFT-01', 'Draft Drape', 6000, 220, 260, 'Velvet', 'Midnight', '#112233', 'draft', 'in_stock')
  ON CONFLICT (id) DO NOTHING;
END $$;

-- 3. Anonymous (public) Role Tests
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claim.sub" TO '';

-- Test: Anon can read published and archived products
SELECT results_eq(
  $$ SELECT slug FROM public.products ORDER BY slug $$,
  $$ VALUES ('test-archived-curtain'), ('test-published-curtain') $$,
  'Anon can view published and archived products'
);

-- Test: Anon CANNOT read draft products
SELECT is_empty(
  $$ SELECT id FROM public.products WHERE status = 'draft' $$,
  'Anon must not see draft products'
);

-- Test: Anon CANNOT read admins table
SELECT throws_ok(
  $$ SELECT * FROM public.admins $$,
  'permission denied for table admins',
  'Anon cannot read admins table'
);

-- Test: Anon CANNOT insert products
SELECT throws_ok(
  $$ INSERT INTO public.products (slug, sku, name, price_kes, width_cm, drop_cm, material_name, color_name, color_hex)
     VALUES ('anon-hack', 'SKU-ANON', 'Hack', 1000, 100, 100, 'Silk', 'Red', '#FF0000') $$,
  'permission denied for table products',
  'Anon cannot insert products'
);

-- 4. Authenticated Non-Admin User Tests
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '22222222-2222-2222-2222-222222222222';

-- Test: Non-admin authenticated user CANNOT read draft products
SELECT is_empty(
  $$ SELECT id FROM public.products WHERE status = 'draft' $$,
  'Non-admin authenticated user cannot view draft products'
);

-- Test: Non-admin authenticated user CANNOT insert products
SELECT throws_ok(
  $$ INSERT INTO public.products (slug, sku, name, price_kes, width_cm, drop_cm, material_name, color_name, color_hex)
     VALUES ('non-admin-hack', 'SKU-NONADMIN', 'Hack', 1000, 100, 100, 'Silk', 'Red', '#FF0000') $$,
  '42501', -- Insufficient privilege / RLS with check violation
  'Non-admin authenticated user cannot insert products'
);

-- Test: Non-admin authenticated user CANNOT update products
SELECT results_eq(
  $$ UPDATE public.products SET name = 'Hacked' WHERE id = '33333333-3333-3333-3333-333333333331' RETURNING id $$,
  $$ SELECT NULL::uuid WHERE false $$,
  'Non-admin authenticated user cannot update products'
);

-- Test: Non-admin authenticated user CANNOT read admin records for other users
SELECT is_empty(
  $$ SELECT * FROM public.admins WHERE user_id = '11111111-1111-1111-1111-111111111111' $$,
  'Non-admin cannot see other user records in admins table'
);

-- 5. Authenticated Verified Admin (Owner) Tests
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';

-- Test: Admin CAN view draft products
SELECT results_eq(
  $$ SELECT slug FROM public.products WHERE status = 'draft' $$,
  $$ VALUES ('test-draft-curtain') $$,
  'Admin can view draft products'
);

-- Test: Admin CAN view ALL products (published, archived, draft)
SELECT results_eq(
  $$ SELECT COUNT(*)::integer FROM public.products WHERE id IN (
    '33333333-3333-3333-3333-333333333331',
    '33333333-3333-3333-3333-333333333332',
    '33333333-3333-3333-3333-333333333333'
  ) $$,
  $$ VALUES (3) $$,
  'Admin can see all products regardless of status'
);

-- Test: Admin CAN insert new products
SELECT lives_ok(
  $$ INSERT INTO public.products (
       id, slug, sku, name, price_kes, width_cm, drop_cm, material_name, color_name, color_hex, status
     ) VALUES (
       '44444444-4444-4444-4444-444444444444',
       'admin-created-curtain',
       'SKU-ADM-01',
       'Admin Drape',
       5200, 240, 260,
       'Linen Blend',
       'Bone',
       '#E8E3D9',
       'draft'
     ) $$,
  'Admin can insert products'
);

-- Test: Admin CAN update product fields and status
SELECT results_eq(
  $$ UPDATE public.products
     SET status = 'published', stock_status = 'out_of_stock'
     WHERE id = '44444444-4444-4444-4444-444444444444'
     RETURNING status::text $$,
  $$ VALUES ('published') $$,
  'Admin can update product status'
);

-- Test: Admin CAN delete products
SELECT results_eq(
  $$ DELETE FROM public.products WHERE id = '44444444-4444-4444-4444-444444444444' RETURNING id $$,
  $$ VALUES ('44444444-4444-4444-4444-444444444444'::uuid) $$,
  'Admin can delete products'
);

-- 6. Slug History RLS Tests
-- Test: Admin can insert slug history
SELECT lives_ok(
  $$ INSERT INTO public.slug_history (product_id, old_slug)
     VALUES ('33333333-3333-3333-3333-333333333331', 'test-old-slug') $$,
  'Admin can insert slug history'
);

-- Test: Public can view slug history for viewable product
SET LOCAL ROLE anon;
SELECT results_eq(
  $$ SELECT old_slug FROM public.slug_history WHERE old_slug = 'test-old-slug' $$,
  $$ VALUES ('test-old-slug') $$,
  'Public can lookup slug history for published product'
);

-- 7. Storage Objects & Product Images Hardening Tests
-- Test: Anon CANNOT select storage objects from product-media
SELECT is_empty(
  $$ SELECT name FROM storage.objects WHERE bucket_id = 'product-media' $$,
  'Anon cannot list storage objects in product-media'
);

-- Test: Non-admin authenticated user CANNOT select storage objects from product-media
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '22222222-2222-2222-2222-222222222222';
SELECT is_empty(
  $$ SELECT name FROM storage.objects WHERE bucket_id = 'product-media' $$,
  'Non-admin authenticated user cannot list storage objects in product-media'
);

-- Test: Admin CAN select storage objects in product-media
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SELECT lives_ok(
  $$ SELECT count(*) FROM storage.objects WHERE bucket_id = 'product-media' $$,
  'Admin can inspect storage objects in product-media'
);

-- 8. Paired Tests for rename_product_slug RPC (owner OK, anon and non-admin rejected)
-- Test: Anon cannot execute rename_product_slug RPC
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claim.sub" TO '';
SELECT throws_ok(
  $$ SELECT public.rename_product_slug('33333333-3333-3333-3333-333333333331', 'anon-slug') $$,
  '42501',
  'Anon caller must be rejected from rename_product_slug RPC'
);

-- Test: Authenticated non-admin cannot execute rename_product_slug RPC
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '22222222-2222-2222-2222-222222222222';
SELECT throws_ok(
  $$ SELECT public.rename_product_slug('33333333-3333-3333-3333-333333333331', 'nonadmin-slug') $$,
  '42501',
  'Non-admin authenticated user must be rejected from rename_product_slug RPC'
);

-- Test: Verified admin CAN execute rename_product_slug RPC
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';
SELECT lives_ok(
  $$ SELECT public.rename_product_slug('33333333-3333-3333-3333-333333333331', 'renamed-published-curtain') $$,
  'Verified admin can rename product slug via RPC'
);

-- Verify product slug updated
SELECT results_eq(
  $$ SELECT slug FROM public.products WHERE id = '33333333-3333-3333-3333-333333333331' $$,
  $$ VALUES ('renamed-published-curtain') $$,
  'Product slug must be updated to new value'
);

-- Verify old slug was preserved in slug_history
SELECT results_eq(
  $$ SELECT old_slug FROM public.slug_history WHERE product_id = '33333333-3333-3333-3333-333333333331' AND old_slug = 'test-published-curtain' $$,
  $$ VALUES ('test-published-curtain') $$,
  'Old slug must be recorded in slug_history for 301 redirection'
);

-- Test: Cyclical renaming A -> B -> A works and deletes matching slug_history row
SELECT lives_ok(
  $$ SELECT public.rename_product_slug('33333333-3333-3333-3333-333333333331', 'test-published-curtain') $$,
  'Cyclical renaming A -> B -> A works for verified admin'
);

SELECT is_empty(
  $$ SELECT 1 FROM public.slug_history WHERE product_id = '33333333-3333-3333-3333-333333333331' AND old_slug = 'test-published-curtain' $$,
  'Product own matching history row must be deleted when returning to original slug'
);

SELECT * FROM finish();
ROLLBACK;


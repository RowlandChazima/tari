-- Slice 2 Step 2d Migration: Atomic Slug Renaming with 301 History Preservation
-- Function: rename_product_slug(product_id, new_slug)
-- Mode: SECURITY INVOKER with caller check against public.admins

CREATE OR REPLACE FUNCTION public.rename_product_slug(
  p_product_id UUID,
  p_new_slug TEXT
)
RETURNS public.products
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_caller_id UUID;
  v_old_slug TEXT;
  v_updated_product public.products%ROWTYPE;
BEGIN
  -- 1. Check that caller is a verified admin
  v_caller_id := (SELECT auth.uid());
  IF v_caller_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.admins WHERE user_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not a verified admin' USING ERRCODE = '42501';
  END IF;

  -- 2. Validate slug format (lowercase alphanumeric with single hyphens, no edge hyphens)
  IF p_new_slug IS NULL OR NOT (p_new_slug ~* '^[a-z0-9]+(?:-[a-z0-9]+)*$') THEN
    RAISE EXCEPTION 'Invalid slug format: Slug must match ^[a-z0-9]+(?:-[a-z0-9]+)*$' USING ERRCODE = '22023';
  END IF;

  -- 3. Retrieve product and current slug
  SELECT slug INTO v_old_slug
  FROM public.products
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found: %', p_product_id USING ERRCODE = 'P0002';
  END IF;

  -- If identical, no-op and return current record
  IF v_old_slug = p_new_slug THEN
    SELECT * INTO v_updated_product FROM public.products WHERE id = p_product_id;
    RETURN v_updated_product;
  END IF;

  -- 4. Reject slugs currently used by another product
  IF EXISTS (
    SELECT 1 FROM public.products
    WHERE slug = p_new_slug AND id <> p_product_id
  ) THEN
    RAISE EXCEPTION 'Slug % is already in use by another product', p_new_slug USING ERRCODE = '23505';
  END IF;

  -- 5. Reject slugs used in another product's slug_history
  IF EXISTS (
    SELECT 1 FROM public.slug_history
    WHERE old_slug = p_new_slug AND product_id <> p_product_id
  ) THEN
    RAISE EXCEPTION 'Slug % already exists in slug_history for another product', p_new_slug USING ERRCODE = '23505';
  END IF;

  -- 6. Delete this product's own matching history row (allows A -> B -> A cyclical renaming)
  DELETE FROM public.slug_history
  WHERE product_id = p_product_id AND old_slug = p_new_slug;

  -- 7. Insert the old slug into slug_history for permanent 301 redirection
  INSERT INTO public.slug_history (product_id, old_slug)
  VALUES (p_product_id, v_old_slug)
  ON CONFLICT (old_slug) DO UPDATE
    SET product_id = EXCLUDED.product_id;

  -- 8. Update the product's slug
  UPDATE public.products
  SET slug = p_new_slug
  WHERE id = p_product_id
  RETURNING * INTO v_updated_product;

  RETURN v_updated_product;
END;
$$;

-- Grant execution to authenticated users (internal admin verification enforces authorization)
GRANT EXECUTE ON FUNCTION public.rename_product_slug(UUID, TEXT) TO authenticated;


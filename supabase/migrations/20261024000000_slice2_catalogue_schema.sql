-- Slice 2 Schema: Tables, Admins, Triggers, RLS & Storage Hardening

-- 1. Create Enums
CREATE TYPE public.product_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.stock_status AS ENUM ('in_stock', 'out_of_stock');
CREATE TYPE public.light_transmission_level AS ENUM ('blackout', 'dimout', 'semi_sheer', 'sheer');

-- 2. Admins Table for Owner RLS Verification (real UUID lookup)
CREATE TABLE public.admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view admins table"
  ON public.admins FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 3. Products Table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL CHECK (slug ~* '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_kes INTEGER NOT NULL CHECK (price_kes >= 0),
  
  -- Dimensions in cm
  width_cm INTEGER NOT NULL CHECK (width_cm > 0),
  drop_cm INTEGER NOT NULL CHECK (drop_cm > 0),
  header_style TEXT NOT NULL DEFAULT 'eyelet',
  
  -- Weave & Color
  material_name TEXT NOT NULL,
  color_name TEXT NOT NULL,
  color_hex TEXT NOT NULL CHECK (color_hex ~* '^#[0-9a-f]{6}$'),
  light_transmission public.light_transmission_level NOT NULL DEFAULT 'dimout',
  
  -- Publication & Stock
  status public.product_status NOT NULL DEFAULT 'draft',
  stock_status public.stock_status NOT NULL DEFAULT 'in_stock',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for auto-updating updated_at with secure search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_products_status ON public.products (status);
CREATE INDEX idx_products_slug ON public.products (slug);
CREATE INDEX idx_products_sku ON public.products (sku);

-- 4. Slug History Table (Permanent 301 Redirects)
CREATE TABLE public.slug_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  old_slug TEXT UNIQUE NOT NULL CHECK (old_slug ~* '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_slug_history_old_slug ON public.slug_history (old_slug);

-- 5. Trigger rejecting product slugs found in slug_history with secure search_path
CREATE OR REPLACE FUNCTION public.check_slug_not_in_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.slug_history
    WHERE old_slug = NEW.slug
      AND product_id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'Slug % already exists in slug_history for another product', NEW.slug;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_check_slug_history
  BEFORE INSERT OR UPDATE OF slug ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.check_slug_not_in_history();

-- 6. Product Images Table
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL, -- "products/{product_id}/{timestamp}.webp"
  alt_text TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_images_product_id ON public.product_images (product_id, sort_order ASC);

-- 7. Row Level Security Policies (with (select auth.uid()) optimization)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slug_history ENABLE ROW LEVEL SECURITY;

-- A. Public SELECT policies
CREATE POLICY "Public can view published and archived products"
  ON public.products FOR SELECT
  TO anon, authenticated
  USING (status IN ('published', 'archived'));

CREATE POLICY "Public can view product images for published and archived products"
  ON public.product_images FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_images.product_id
      AND products.status IN ('published', 'archived')
    )
  );

-- Slug history read policy limited to published or archived products only
CREATE POLICY "Public can lookup slug history for viewable products"
  ON public.slug_history FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = slug_history.product_id
      AND products.status IN ('published', 'archived')
    )
  );

-- B. Owner WRITE policies (checked via (select auth.uid()) in admins table)
CREATE POLICY "Only verified admins can write products"
  ON public.products FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = (SELECT auth.uid())));

CREATE POLICY "Only verified admins can write product images"
  ON public.product_images FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = (SELECT auth.uid())));

CREATE POLICY "Only verified admins can write slug history"
  ON public.slug_history FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = (SELECT auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = (SELECT auth.uid())));

-- 8. Supabase Storage: product-media Bucket with file-size & MIME limits
-- Public bucket: images are directly served to the public via Supabase public URLs without needing a storage.objects SELECT policy
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-media',
  'product-media',
  true,
  5242880, -- 5MB limit
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage write policies (owner-only, checked via (select auth.uid()))
CREATE POLICY "Only verified admins can upload product-media storage objects"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-media'
    AND EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Only verified admins can update product-media storage objects"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-media'
    AND EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Only verified admins can delete product-media storage objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-media'
    AND EXISTS (SELECT 1 FROM public.admins WHERE admins.user_id = (SELECT auth.uid()))
  );

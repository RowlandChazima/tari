-- Seed Data (Development Environment Only)

INSERT INTO public.products (
  id,
  slug,
  sku,
  name,
  description,
  price_kes,
  width_cm,
  drop_cm,
  header_style,
  material_name,
  color_name,
  color_hex,
  light_transmission,
  status,
  stock_status
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'nairobi-sand-woven-linen-drape',
  'TAR-LIN-240',
  'Nairobi Sand Woven Linen Drape',
  'Ready-made textured curtain panel with eyelet rings. Fixed size 260cm width by 240cm drop, suitable for home and office windows.',
  4800,
  260,
  240,
  'eyelet',
  'Heavy Textured Linen-Cotton Slub',
  'Savannah Ochre',
  '#C29B72',
  'dimout',
  'published',
  'in_stock'
) ON CONFLICT (slug) DO NOTHING;


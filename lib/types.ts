export type ProductStatus = 'draft' | 'published' | 'archived';
export type StockStatus = 'in_stock' | 'out_of_stock';
export type LightTransmissionLevel = 'blackout' | 'dimout' | 'semi_sheer' | 'sheer';

/**
 * Mapping light transmission level enum to physical numbers and labels
 */
export const LIGHT_TRANSMISSION_MAP: Record<
  LightTransmissionLevel,
  { value: number; label: string }
> = {
  blackout: { value: 0.02, label: 'Blackout' },
  dimout: { value: 0.14, label: 'Dimout' },
  semi_sheer: { value: 0.38, label: 'Semi-Sheer' },
  sheer: { value: 0.68, label: 'Sheer' },
};

export interface DatabaseProductImage {
  id: string;
  product_id: string;
  storage_path: string;
  alt_text: string;
  sort_order: number;
  created_at: string;
}

export interface ProductImageUI {
  id: string;
  storagePath: string;
  altText: string;
  sortOrder: number;
  url: string;
}

export interface DatabaseProduct {
  id: string;
  slug: string;
  sku: string;
  name: string;
  description: string;
  price_kes: number;
  width_cm: number;
  drop_cm: number;
  header_style: string;
  material_name: string;
  color_name: string;
  color_hex: string;
  light_transmission: LightTransmissionLevel;
  status: ProductStatus;
  stock_status: StockStatus;
  created_at: string;
  updated_at: string;
  product_images?: DatabaseProductImage[];
}

export interface SlugHistoryRow {
  id: string;
  product_id: string;
  old_slug: string;
  created_at: string;
}

/**
 * Helper to construct public URL for Supabase storage objects in product-media bucket
 */
export function getProductImageUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;
  return `${supabaseUrl}/storage/v1/object/public/product-media/${storagePath}`;
}

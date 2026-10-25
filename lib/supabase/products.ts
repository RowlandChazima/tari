import { createPublicClient } from './public';
import { DatabaseProduct, LIGHT_TRANSMISSION_MAP, getProductImageUrl, ProductImageUI } from '../types';
import { ProductDetails, TARI_PRODUCT } from '../../app/product-data';

/**
 * Transforms a Supabase DatabaseProduct row into ProductDetails for the UI
 */
export function mapDatabaseProductToUI(dbProduct: DatabaseProduct): ProductDetails {
  const lightTransmissionMeta = LIGHT_TRANSMISSION_MAP[dbProduct.light_transmission] || {
    value: 0.14,
    label: 'Dimout',
  };

  const images: ProductImageUI[] = (dbProduct.product_images || [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((img) => ({
      id: img.id,
      storagePath: img.storage_path,
      altText: img.alt_text,
      sortOrder: img.sort_order,
      url: getProductImageUrl(img.storage_path) || '',
    }));

  const coverImageUrl = images.length > 0 ? images[0].url : null;

  return {
    id: dbProduct.id,
    slug: dbProduct.slug,
    sku: dbProduct.sku,
    name: dbProduct.name,
    priceKES: dbProduct.price_kes,
    dimensions: {
      widthCm: dbProduct.width_cm,
      dropCm: dbProduct.drop_cm,
      headerStyle: 'eyelet',
    },
    lightTransmission: lightTransmissionMeta.value,
    lightTransmissionLabel: lightTransmissionMeta.label,
    materialName: dbProduct.material_name,
    description: dbProduct.description,
    colorName: dbProduct.color_name,
    colorHex: dbProduct.color_hex,
    status: dbProduct.status,
    stockStatus: dbProduct.stock_status,
    images,
    coverImageUrl,
  };
}

/**
 * Fetch all published products for the catalogue listing
 */
export async function getPublishedProducts(): Promise<ProductDetails[]> {
  const supabase = createPublicClient();

  if (!supabase) {
    return [TARI_PRODUCT];
  }

  const { data, error } = await supabase
    .from('products')
    .select('*, product_images(*)')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    // If the database is connected but migration has not yet been applied, fall back in dev only
    if (process.env.NODE_ENV === 'production' && !error.message.includes('schema cache')) {
      throw error;
    }
    return [TARI_PRODUCT];
  }

  return (data || []).map(mapDatabaseProductToUI);
}

/**
 * Fetch a single product by slug (supports both published and archived)
 * Also checks slug_history for permanent 301 redirects
 */
export async function getProductBySlug(
  slug: string
): Promise<{
  product: ProductDetails | null;
  redirectSlug?: string;
  isArchived?: boolean;
}> {
  const supabase = createPublicClient();

  if (!supabase) {
    if (slug === TARI_PRODUCT.slug || slug === 'default') {
      return { product: TARI_PRODUCT };
    }
    return { product: null };
  }

  // 1. Check active or archived products
  const { data: productRow, error: productError } = await supabase
    .from('products')
    .select('*, product_images(*)')
    .eq('slug', slug)
    .single();

  if (productRow && !productError) {
    const product = mapDatabaseProductToUI(productRow);
    if (product.status === 'archived') {
      return { product, isArchived: true };
    }
    return { product };
  }

  // 2. Check slug_history for old slug redirect
  const { data: historyRow } = await supabase
    .from('slug_history')
    .select('product_id')
    .eq('old_slug', slug)
    .single();

  if (historyRow) {
    const { data: currentProduct } = await supabase
      .from('products')
      .select('slug')
      .eq('id', historyRow.product_id)
      .single();

    if (currentProduct?.slug) {
      return { product: null, redirectSlug: currentProduct.slug };
    }
  }

  // If table does not exist yet (pre-migration), allow fallback for seeded slug
  if (slug === TARI_PRODUCT.slug) {
    return { product: TARI_PRODUCT };
  }

  return { product: null };
}

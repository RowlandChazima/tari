import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { DatabaseProduct } from '@/lib/types';
import { TARI_PRODUCT } from '@/app/product-data';
import { AdminProductsList } from './admin-products-list';
import { OrphanCleanupButton } from './orphan-cleanup-button';

const MOCK_ADMIN_PRODUCT: DatabaseProduct = {
  id: TARI_PRODUCT.id || '00000000-0000-0000-0000-000000000001',
  slug: TARI_PRODUCT.slug,
  sku: TARI_PRODUCT.sku,
  name: TARI_PRODUCT.name,
  description: TARI_PRODUCT.description,
  price_kes: TARI_PRODUCT.priceKES,
  width_cm: TARI_PRODUCT.dimensions.widthCm,
  drop_cm: TARI_PRODUCT.dimensions.dropCm,
  header_style: TARI_PRODUCT.dimensions.headerStyle,
  material_name: TARI_PRODUCT.materialName,
  color_name: TARI_PRODUCT.colorName,
  color_hex: TARI_PRODUCT.colorHex,
  light_transmission: 'dimout',
  status: TARI_PRODUCT.status || 'published',
  stock_status: TARI_PRODUCT.stockStatus || 'in_stock',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export default async function AdminProductsPage() {
  const supabase = await createClient();

  let products: DatabaseProduct[] = [];

  if (supabase) {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_images(*)')
      .order('created_at', { ascending: false });

    if (error) {
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
      // Dev mock fallback if table is not yet migrated
      products = [MOCK_ADMIN_PRODUCT];
    } else {
      products = data || [];
    }
  } else {
    // Dev mock fallback when offline
    products = [MOCK_ADMIN_PRODUCT];
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <h1 className="font-display text-2xl font-bold text-stone-900 tracking-tight">
            Inventory & Products
          </h1>
          <p className="text-sm text-stone-500 mt-0.5">
            Manage live stock availability for the Tari catalogue.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-stone-500 bg-white px-3 py-2 rounded-md border border-stone-200 tabular-nums">
            {products.length} {products.length === 1 ? 'product' : 'products'}
          </div>
          <Link
            href="/admin/products/new"
            className="min-h-[44px] px-4 py-2 rounded-lg bg-stone-900 text-white text-xs font-semibold hover:bg-stone-800 active:bg-stone-950 transition-colors inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-stone-900 cursor-pointer shadow-xs"
          >
            <span className="text-sm font-bold leading-none">+</span>
            <span>Add Curtain</span>
          </Link>
        </div>
      </div>

      <AdminProductsList products={products} />

      {/* Storage Maintenance Section */}
      <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
            Storage Maintenance
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Remove temporary unreferenced image files older than 24 hours.
          </p>
        </div>
        <OrphanCleanupButton />
      </div>
    </div>
  );
}

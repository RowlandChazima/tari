import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DatabaseProduct } from '@/lib/types';
import { TARI_PRODUCT } from '@/app/product-data';
import { ProductForm } from '../product-form';

export const metadata = {
  title: 'Edit Product | Tari Admin',
};

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  let product: DatabaseProduct | null = null;

  if (supabase) {
    const { data, error } = await supabase
      .from('products')
      .select('*, product_images(*)')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      product = data;
    }
  }

  // Development mock fallback
  if (!product) {
    if (id === TARI_PRODUCT.id || id === '00000000-0000-0000-0000-000000000001') {
      product = {
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
    } else {
      notFound();
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <ProductForm
        initialProduct={product}
        initialImages={product.product_images || []}
        isNew={false}
      />
    </div>
  );
}


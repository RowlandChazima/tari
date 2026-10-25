import type { Metadata } from 'next';
import Link from 'next/link';
import { permanentRedirect, notFound } from 'next/navigation';
import {
  OWNER_PHONE_NUMBER,
  getWhatsAppInquiryUrl,
  getTelCallUrl,
  TARI_PRODUCT,
} from '@/app/product-data';
import { CurtainPreview } from '@/app/curtain-preview';
import { ProductGallery } from './product-gallery';
import { getProductBySlug } from '@/lib/supabase/products';

export async function generateStaticParams() {
  return [{ slug: TARI_PRODUCT.slug }];
}

interface CurtainPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: CurtainPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProductBySlug(slug);

  if (result.redirectSlug || !result.product) {
    return {
      title: 'Curtain Details | Tari Kenya',
    };
  }

  const p = result.product;

  // (4) Archived pages: noindex
  if (result.isArchived) {
    return {
      title: `${p.name} (No Longer Available) | Tari Kenya`,
      description: `The curtain model ${p.name} has been archived from our catalogue. Explore our active collection of ready-made curtains.`,
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  return {
    title: `${p.name} (${p.dimensions.widthCm}×${p.dimensions.dropCm}cm) | Tari Kenya`,
    description: `Buy ${p.name}. Ready-made fixed size ${p.dimensions.widthCm}cm width × ${p.dimensions.dropCm}cm drop. Price: KES ${p.priceKES.toLocaleString()}. Nationwide delivery across Kenya. Confirm availability via WhatsApp or phone.`,
    openGraph: {
      title: `${p.name} · KES ${p.priceKES.toLocaleString()} | Tari Curtains`,
      description: `Ready-made fixed size: ${p.dimensions.widthCm}cm × ${p.dimensions.dropCm}cm. Light transmission: ${p.lightTransmissionLabel}. Nationwide delivery across Kenya. Contact to order.`,
      url: `https://tari.co.ke/curtains/${p.slug}`,
      siteName: 'Tari Curtains Kenya',
      locale: 'en_KE',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${p.name} · KES ${p.priceKES.toLocaleString()}`,
      description: `Ready-made curtain in Kenya. Fixed size ${p.dimensions.widthCm}cm × ${p.dimensions.dropCm}cm. Contact via WhatsApp or Call.`,
    },
  };
}

export default async function CurtainProductPage({ params }: CurtainPageProps) {
  const { slug } = await params;
  const { product, redirectSlug, isArchived } = await getProductBySlug(slug);

  // 1. Permanent redirect for historical slugs
  if (redirectSlug) {
    permanentRedirect(`/curtains/${redirectSlug}`);
  }

  // 2. 404 if product not found
  if (!product) {
    notFound();
  }

  // 3. Archived model screen ("No longer available")
  if (isArchived) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] text-stone-900 font-sans flex flex-col justify-center items-center px-4 py-16">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-stone-200 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center mx-auto mb-4 text-xl">
            📦
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-amber-900 block mb-1">
            Archived Model · {product.sku}
          </span>
          <h1 className="text-2xl font-bold font-display text-stone-950 mb-3">
            This curtain model is no longer available
          </h1>
          <p className="text-xs text-stone-600 mb-6 leading-relaxed">
            The ready-made curtain <strong>{product.name}</strong> has been archived from our catalogue. You can explore active ready-made curtains or contact the owner directly for recommendations.
          </p>

          <div className="flex flex-col gap-2.5">
            <Link
              href="/"
              className="w-full py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition"
            >
              Browse Active Catalogue
            </Link>
            <a
              href={`https://wa.me/${OWNER_PHONE_NUMBER.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                `Hello Tari, I was looking for the archived curtain ${product.name} (${product.sku}). Are there similar ready-made sizes available?`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-800 font-semibold text-xs transition"
            >
              Ask Owner on WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  const p = product;
  const whatsAppLink = getWhatsAppInquiryUrl(p, OWNER_PHONE_NUMBER);
  const phoneCallLink = getTelCallUrl(OWNER_PHONE_NUMBER);
  const isOutOfStock = p.stockStatus === 'out_of_stock';

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 font-sans selection:bg-amber-200">
      {/* Header */}
      <header className="border-b border-stone-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-2xl font-bold tracking-tight text-stone-950 font-display">
              TARI
            </Link>
            <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-600 border border-stone-200 font-medium">
              Curtains Kenya
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="hidden md:inline-flex items-center gap-2 text-stone-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Nationwide Delivery Across Kenya
            </span>
            <a
              href={whatsAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors active:scale-[0.97] shadow-xs motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
              <span>WhatsApp Inquiries</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Breadcrumb with product name */}
        <div className="flex items-center gap-2 text-xs text-stone-500 mb-4 font-medium">
          <Link href="/" className="hover:text-stone-800 transition">
            Catalogue
          </Link>
          <span>/</span>
          <span className="text-amber-900 font-semibold">{p.sku}</span>
          <span>/</span>
          <span className="text-stone-700 font-semibold truncate max-w-xs">{p.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Scaled Visualizer & Photo Gallery (Sticky on desktop) */}
          <div className="lg:col-span-7 flex flex-col gap-2 lg:sticky lg:top-20">
            <CurtainPreview product={p} />
            <ProductGallery images={p.images || []} productName={p.name} />
          </div>

          {/* Right: Specifications & Ordering */}
          <div className="lg:col-span-5 flex flex-col gap-6 bg-white p-6 sm:p-7 rounded-2xl border border-stone-200/80 shadow-xs">
            <div>
              <div className="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-stone-100 text-stone-700 border border-stone-200 mb-2">
                READY-MADE · FIXED SIZE
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-950 font-display">
                {p.name}
              </h1>
              <p className="text-sm text-stone-600 mt-2 leading-relaxed">
                {p.description}
              </p>
            </div>

            {/* Price Box */}
            <div className="p-4 rounded-xl bg-[#FAF8F5] border border-stone-200 flex flex-col gap-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs uppercase tracking-wider text-stone-600 font-medium">
                  Fixed Price
                </span>
                <span className="text-2xl sm:text-3xl font-bold text-stone-950 tracking-tight font-display tabular-nums whitespace-nowrap">
                  KES {p.priceKES.toLocaleString()}
                </span>
              </div>
              <div className="pt-1 border-t border-stone-200/60">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded border inline-block ${
                    isOutOfStock
                      ? 'bg-amber-50 text-amber-900 border-amber-200/80'
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                  }`}
                >
                  {isOutOfStock ? 'Currently out of stock — WhatsApp to check restock' : 'In stock — Call or WhatsApp to order'}
                </span>
              </div>
            </div>

            {/* Key Dimension Matrix */}
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-stone-700 font-display">
                Fixed Product Dimensions
              </h2>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-stone-200 bg-stone-50/50">
                  <span className="text-stone-600 block">Flat Total Width</span>
                  <span className="text-base font-bold text-stone-900 tabular-nums">
                    {p.dimensions.widthCm} cm
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-stone-200 bg-stone-50/50">
                  <span className="text-stone-600 block">Finished Drop (Height)</span>
                  <span className="text-base font-bold text-stone-900 tabular-nums">
                    {p.dimensions.dropCm} cm
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-stone-200 bg-stone-50/50">
                  <span className="text-stone-600 block">Header Style</span>
                  <span className="text-sm font-semibold capitalize text-stone-900">
                    {p.dimensions.headerStyle} Rings
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-stone-200 bg-stone-50/50">
                  <span className="text-stone-600 block">Fabric Weave</span>
                  <span className="text-sm font-semibold text-stone-900">
                    {p.materialName}
                  </span>
                </div>
              </div>
            </div>

            {/* Light Transmission Rating */}
            <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-800">Fabric Light Transmission</span>
                <span className="font-bold text-amber-900">
                  {p.lightTransmissionLabel || 'Dimout'}
                </span>
              </div>
              <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-amber-600 h-2 rounded-full transition-all"
                  style={{ width: `${Math.round(p.lightTransmission * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-stone-500 tabular-nums pt-0.5">
                <span>Blackout</span>
                <span>Dimout</span>
                <span>Semi-Sheer</span>
                <span>Sheer</span>
              </div>
            </div>

            {/* CTAs: Always active whatever the stock status */}
            <div className="flex flex-col gap-2.5 pt-2">
              <a
                href={whatsAppLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors active:scale-[0.97] shadow-sm motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-emerald-600"
              >
                <span>{isOutOfStock ? 'Inquire on WhatsApp (Restock Date)' : 'Order via WhatsApp (Check Stock)'}</span>
              </a>

              <a
                href={phoneCallLink}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 font-semibold text-sm transition-colors active:scale-[0.97] motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-stone-600"
              >
                <span>📞 Call Owner ({OWNER_PHONE_NUMBER})</span>
              </a>

              <p className="text-center text-[11px] text-stone-600 mt-1">
                Stock availability is confirmed directly over WhatsApp or phone before dispatch.
              </p>
            </div>
          </div>
        </div>

        {/* How Nationwide Ordering Works */}
        <section className="mt-14 pt-10 border-t border-stone-200">
          <h2 className="text-lg font-bold font-display text-stone-900 mb-6 text-center sm:text-left">
            How Nationwide Ordering Works at Tari
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl bg-white border border-stone-200 shadow-2xs">
              <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center mb-3 tabular-nums">
                1
              </span>
              <h3 className="text-sm font-bold text-stone-900 font-display">Check Your Window Size</h3>
              <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                Confirm your window measurements match this ready-made drop of <span className="tabular-nums font-medium">{p.dimensions.dropCm}cm</span> and flat width of <span className="tabular-nums font-medium">{p.dimensions.widthCm}cm</span>.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-stone-200 shadow-2xs">
              <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center mb-3 tabular-nums">
                2
              </span>
              <h3 className="text-sm font-bold text-stone-900 font-display">WhatsApp or Call Owner</h3>
              <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                Send the curtain code (<code className="text-amber-900 font-semibold">{p.sku}</code>) to the owner to verify stock availability.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-stone-200 shadow-2xs">
              <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center mb-3 tabular-nums">
                3
              </span>
              <h3 className="text-sm font-bold text-stone-900 font-display">Nationwide Delivery</h3>
              <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                Confirmed orders are dispatched for nationwide delivery across Kenya.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Mobile Sticky Bottom Bar (Always active) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-2.5 sm:p-3 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] sm:pb-3 bg-white/95 backdrop-blur-md border-t border-stone-200 z-40 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          {/* (5) Sticky bar at 320px: hide drop label and price never truncates */}
          <div className="min-w-0 flex-shrink-1">
            <span className="hidden min-[360px]:block text-[10px] text-stone-500 uppercase font-medium tabular-nums truncate">
              {p.dimensions.dropCm}cm Drop
            </span>
            <span className="text-sm sm:text-base font-bold text-stone-950 font-display tabular-nums whitespace-nowrap block">
              KES {p.priceKES.toLocaleString()}
            </span>
          </div>

          {/* (5) Shortened button text on narrow mobile so price never truncates */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <a
              href={phoneCallLink}
              className="p-2 sm:p-2.5 rounded-lg border border-stone-300 text-stone-700 bg-stone-50 active:scale-[0.97] transition-transform duration-100 text-sm focus-visible:outline-2 focus-visible:outline-stone-600"
              aria-label="Call owner to order"
            >
              📞
            </a>
            <a
              href={whatsAppLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs active:scale-[0.97] transition-transform duration-100 flex items-center gap-1 shadow-xs focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
              <span className="hidden sm:inline">
                {isOutOfStock ? 'WhatsApp Inquire' : 'WhatsApp Order'}
              </span>
              <span className="sm:hidden">
                {isOutOfStock ? 'Inquire' : 'Order'}
              </span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

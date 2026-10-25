import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  OWNER_PHONE_NUMBER,
  getWhatsAppInquiryUrl,
  getTelCallUrl,
} from './product-data';
import { getPublishedProducts } from '@/lib/supabase/products';

export const metadata: Metadata = {
  title: 'Ready-Made Curtains Kenya | Tari Catalogue',
  description:
    'Browse ready-made architectural curtains for homes and offices in Kenya. Fixed sizes, real light transmission ratings, and nationwide delivery. Order directly via WhatsApp or phone.',
  openGraph: {
    title: 'Ready-Made Curtains Kenya | Tari Catalogue',
    description:
      'Browse ready-made architectural curtains for homes and offices in Kenya. Fixed sizes and nationwide delivery.',
    url: 'https://tari.co.ke',
    siteName: 'Tari Curtains Kenya',
    locale: 'en_KE',
    type: 'website',
  },
};

export default async function CataloguePage() {
  const products = await getPublishedProducts();
  const phoneCallLink = getTelCallUrl(OWNER_PHONE_NUMBER);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-stone-900 font-sans selection:bg-amber-200">
      {/* Header */}
      <header className="border-b border-stone-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold tracking-tight text-stone-950 font-display">
              TARI
            </span>
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
              href={`https://wa.me/${OWNER_PHONE_NUMBER.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors active:scale-[0.97] shadow-xs motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-emerald-600"
            >
              <span>WhatsApp Inquiries</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Catalogue */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8">
          <div className="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold tracking-wide bg-stone-100 text-stone-700 border border-stone-200 mb-2">
            CATALOGUE · READY-MADE
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-950 font-display">
            Ready-Made Curtains
          </h1>
          <p className="text-sm text-stone-600 mt-2 max-w-2xl leading-relaxed">
            Architectural curtains crafted in standard fixed drops and widths. Preview each drape to metric scale with live daylight transmission simulation before contacting the owner.
          </p>
        </div>

        {/* Product Grid or Empty State */}
        {products.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200/80 p-8 sm:p-12 text-center max-w-lg mx-auto shadow-xs">
            <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center mx-auto mb-4 text-xl">
              📦
            </div>
            <h2 className="text-xl font-bold text-stone-950 font-display mb-2">
              Catalogue Update
            </h2>
            <p className="text-sm text-stone-600 mb-6 leading-relaxed">
              We’re updating our catalogue. Call or WhatsApp us to ask what’s in stock.
            </p>
            <a
              href={`https://wa.me/${OWNER_PHONE_NUMBER.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                "Hello Tari, I am checking your catalogue. Could you please let me know what ready-made curtains are currently in stock?"
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs active:scale-[0.97] transition-all shadow-xs"
            >
              <span>WhatsApp Us</span>
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => {
              const whatsAppLink = getWhatsAppInquiryUrl(p, OWNER_PHONE_NUMBER);
              const isOutOfStock = p.stockStatus === 'out_of_stock';

              return (
                <div
                  key={p.sku}
                  className="bg-white rounded-2xl border border-stone-200/80 p-5 sm:p-6 flex flex-col justify-between shadow-xs hover:border-stone-300 transition-colors"
                >
                  <div>
                    {/* (6) Cover Image or Fabric Swatch Placeholder */}
                    {p.coverImageUrl ? (
                      <div className="relative aspect-16/10 rounded-xl overflow-hidden mb-4 bg-stone-100 border border-stone-100">
                        <Image
                          src={p.coverImageUrl}
                          alt={p.name}
                          width={400}
                          height={250}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                      </div>
                    ) : (
                      <div
                        className="relative aspect-16/10 rounded-xl overflow-hidden mb-4 border border-stone-200/60 flex items-center justify-center shadow-2xs"
                        style={{ backgroundColor: p.colorHex || '#e7e5e4' }}
                        aria-hidden="true"
                      >
                        <svg
                          className="w-full h-full opacity-20 text-stone-900"
                          viewBox="0 0 160 100"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        >
                          <path d="M20 10 Q 30 50 20 90 M50 10 Q 60 50 50 90 M80 10 Q 90 50 80 90 M110 10 Q 120 50 110 90 M140 10 Q 150 50 140 90" />
                        </svg>
                        <span className="absolute bottom-2 right-2 text-3xs font-medium text-stone-700/80 bg-white/70 backdrop-blur-2xs px-2 py-0.5 rounded">
                          Fabric Swatch
                        </span>
                      </div>
                    )}

                    {/* Swatch & SKU */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full border border-stone-300 shadow-2xs"
                          style={{ backgroundColor: p.colorHex }}
                          aria-hidden="true"
                        />
                        <span className="text-xs font-semibold text-stone-500">{p.sku}</span>
                      </div>

                      {/* Stock indicator badge */}
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded border ${
                          isOutOfStock
                            ? 'bg-stone-100 text-stone-600 border-stone-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200/80'
                        }`}
                      >
                        {isOutOfStock ? 'Call to check restock' : 'In Stock'}
                      </span>
                    </div>

                    {/* Title */}
                    <h2
                      className="text-lg font-bold text-stone-950 font-display leading-snug line-clamp-2"
                      title={p.name}
                    >
                      <Link
                        href={`/curtains/${p.slug}`}
                        title={p.name}
                        className="hover:text-amber-800 transition-colors"
                      >
                        {p.name}
                      </Link>
                    </h2>

                    <p className="text-xs text-stone-600 mt-1.5 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>

                    {/* Dimension & Light pills */}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-stone-100 text-xs">
                      <div className="bg-stone-50 rounded-lg p-2 border border-stone-100">
                        <span className="text-stone-500 block text-[11px]">Finished Drop</span>
                        <span className="font-bold text-stone-900 tabular-nums">
                          {p.dimensions.dropCm} cm
                        </span>
                      </div>
                      <div className="bg-stone-50 rounded-lg p-2 border border-stone-100">
                        <span className="text-stone-500 block text-[11px]">Flat Width</span>
                        <span className="font-bold text-stone-900 tabular-nums">
                          {p.dimensions.widthCm} cm
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Actions (Stacked label and price) */}
                  <div className="mt-5 pt-4 border-t border-stone-100">
                    <div className="flex flex-col mb-3">
                      <span className="text-xs text-stone-500 font-medium">Fixed Price</span>
                      <span className="text-xl font-bold text-stone-950 font-display tabular-nums">
                        KES {p.priceKES.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={`/curtains/${p.slug}`}
                        className="flex-1 text-center py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs active:scale-[0.97] transition-all"
                      >
                        Preview to Scale
                      </Link>
                      <a
                        href={whatsAppLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs active:scale-[0.97] transition-all shadow-xs"
                        aria-label={`Order ${p.name} on WhatsApp`}
                      >
                        WhatsApp
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* How Nationwide Ordering Works */}
        <section className="mt-16 pt-10 border-t border-stone-200">
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
                Confirm your window measurements match the ready-made drop and width shown for the curtain.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-white border border-stone-200 shadow-2xs">
              <span className="w-7 h-7 rounded-full bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center mb-3 tabular-nums">
                2
              </span>
              <h3 className="text-sm font-bold text-stone-900 font-display">WhatsApp or Call Owner</h3>
              <p className="text-xs text-stone-600 mt-1.5 leading-relaxed">
                Tap WhatsApp or call to verify current stock availability directly with the owner.
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
    </div>
  );
}

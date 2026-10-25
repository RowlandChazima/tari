import { ProductImageUI, ProductStatus, StockStatus } from '@/lib/types';

/**
 * Tari Store Owner Contact Information
 * Single constant for owner phone & WhatsApp contact
 */
export const OWNER_PHONE_NUMBER = "+254700000000"; // PLACEHOLDER: format with international code

export interface ProductDetails {
  id?: string;
  slug: string;
  sku: string;
  name: string;
  priceKES: number;
  dimensions: {
    widthCm: number;
    dropCm: number;
    headerStyle: 'eyelet' | 'pencil-pleat';
  };
  lightTransmission: number;
  lightTransmissionLabel?: string;
  materialName: string;
  description: string;
  colorName: string;
  colorHex: string;
  status?: ProductStatus;
  stockStatus?: StockStatus;
  images?: ProductImageUI[];
  coverImageUrl?: string | null;
}

// TODO confirm with owner:
// - packagingUnit: whether sold as a single panel or a pair (2 panels)
// - recommendedCoverage: recommended track/pole width range for proper fullness
// - careInstructions: dry clean vs gentle cold machine wash
// - deliveryMethod: specific parcel/rider courier partners for nationwide Kenya delivery

/**
 * Helper to construct WhatsApp inquiry link with URL-encoded message.
 * Keeps order buttons active whatever the stock status (e.g. for restocking inquiries).
 */
export function getWhatsAppInquiryUrl(product: ProductDetails, phoneNumber: string = OWNER_PHONE_NUMBER): string {
  const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
  const stockNote = product.stockStatus === 'out_of_stock' ? ' (Note: Marked currently out of stock)' : '';
  const message = `Hello Tari, I am inquiring about the ready-made curtain:\n- Product: ${product.name}\n- SKU: ${product.sku}\n- Fixed Size: ${product.dimensions.widthCm}cm width × ${product.dimensions.dropCm}cm drop\n- Price: KES ${product.priceKES.toLocaleString()}${stockNote}\nIs this currently available in stock for nationwide delivery?`;
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
}

/**
 * Helper to construct telephone Call link
 */
export function getTelCallUrl(phoneNumber: string = OWNER_PHONE_NUMBER): string {
  return `tel:${phoneNumber}`;
}

/**
 * Baseline product for Slice 1 and Development Mock Fallback
 */
export const TARI_PRODUCT: ProductDetails = {
  id: "00000000-0000-0000-0000-000000000001",
  slug: "nairobi-sand-woven-linen-drape",
  sku: "TAR-LIN-240",
  name: "Nairobi Sand Woven Linen Drape",
  priceKES: 4800,
  dimensions: {
    widthCm: 260,
    dropCm: 240,
    headerStyle: "eyelet",
  },
  lightTransmission: 0.14,
  lightTransmissionLabel: "Dimout",
  materialName: "Heavy Textured Linen-Cotton Slub",
  colorName: "Savannah Ochre",
  colorHex: "#C29B72",
  description:
    "Ready-made textured curtain panel with eyelet rings. Fixed size 260cm width by 240cm drop, suitable for home and office windows.",
  status: "published",
  stockStatus: "in_stock",
};

# Tari Deferred Items (Slice 1 Handoff)

This document tracks technical debt, asset requirements, and catalog features intentionally deferred from Slice 1 to maintain focus on the core ready-made curtain visualizer and WhatsApp ordering flow.

---

## 1. Animation & Rendering Performance Pass
- **GPU Transform Migration**: Currently, curtain panel folds and bottom hem paths are procedurally calculated per input event. Investigate transitioning panel gathering to hardware-accelerated CSS `transform: scaleX(...)` with SVG `transform-origin` (left/right anchored at the finials) or damping with an interruptible spring (`useSpring` / `requestAnimationFrame`) to ensure rock-solid 60 FPS on lower-tier Android devices.
- **Resize Observer & Dynamic Aspect Ratios**: Add container measurement hooks if non-standard mobile landscape orientations need dynamic scale recalculation.

## 2. Fonts & Typography
- **Self-Hosted Font Bundling (`next/font/local`)**: Currently loading `Syne` and `Space Grotesk` via `next/font/google`. For fully offline air-gapped CI environments and zero-latency CDN loading in Kenya, download the `.woff2` files and migrate to `next/font/local`.
- **Dynamic Type Scaling**: Expand responsive fluid typography clamps (`clamp(...)`) across smaller sub-360px screens.

## 3. Real Photos & Assets
- **Flat Fabric Swatch Photography**: Replace the procedural SVG slub weave (`#flat-linen-weave`) with high-resolution macro photography of the physical fabric slub texture.
- **Outdoor Scenery Apertures**: Replace the stylized SVG vector outdoor backdrop with a real photograph of Nairobi daylight and an evening skyline cutout.
- **Finished Curtain Drape Gallery**: Add a secondary photography zoom section showing the real stitched eyelet ring finish and weighted hem.

## 4. Real Product Data & Catalog
- **Confirm Store Owner Specifications**:
  - Packaging unit: Confirm whether prices are per single panel or per pair (set of 2 panels).
  - Recommended coverage: Confirm recommended pole/track width ranges for optimal pleat fullness.
  - Fabric care instructions: Confirm dry-cleaning vs machine-washable guidance.
  - Nationwide courier partners: Confirm specific parcel dispatch providers (e.g., Fargo Courier, G4S, Nairobi rider services).
- **Multiple Color Variants**: Implement a color swatch selector for products with multiple colorways (e.g., Sand, Charcoal, Terracotta, Forest Green).
- **Multi-Product Catalog & Filtering**: Expand beyond the single hardcoded product page to a browsable catalog grouped by drop height (e.g., 220cm, 240cm, 270cm, 300cm) and room type (Office vs Home).

## 5. Stock Management & Commerce Operations
- **Live Inventory Indicator**: Add an administrative flag or lightweight API to toggle "In Stock" vs "Sold Out - Next Batch Arriving" per SKU before the customer taps WhatsApp.
- **Automated Order Tracking**: Provide customers with order status updates or courier tracking links post-dispatch.


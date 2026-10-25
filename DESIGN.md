# Design System: Tari

## Visual World & Identity
Tari's visual identity balances architectural precision with the organic warmth of Kenyan daylight. It prioritizes metric honesty, technical clarity, and localized commerce rituals.

### Color Palette
- **Ground / Canvas**: `#FAF8F5` (warm linen / alabaster)
- **Architectural Drafting Elements**: `#F6F3EE` (day wall), `#1F1B18` (evening wall), `#D6CEC2` (floor moulding)
- **Dimension Lines & Accents**: `#B45309` (amber-700 / ochre)
- **Primary Order Action**: `#059669` / `#10B981` (emerald green, universally recognized for WhatsApp in Kenya)
- **Text & Hierarchy**: `#0C0A09` (stone-950 headings), `#44403C` (stone-700 body text), `#78716C` (stone-500 annotations)

### Typography
- **Headings & Display**: `Plus Jakarta Sans` via `next/font/google` (`--font-plus-jakarta-sans`, weights: 600, 700, 800) mapped to `.font-display` for modern, clean, geometric architectural presence across the logotype, product name, section headings, and headline prices.
- **Body, UI & Meta**: `Inter` via `next/font/google` (`--font-inter`, weights: 400, 500, 600, 700) mapped to `.font-sans` for unmatched screen legibility across dense spec sheets, body descriptions, and callout text.
- **Monospace**: Explicitly removed. No generic monospace fonts used.
- **Numerals**: Configured with `font-variant-numeric: tabular-nums` (`.tabular-nums`) across all prices, dimensions (cm/m), percentages, scale coordinates, and numerical steps to maintain aligned geometry.

### Component Vocabulary
- **Architectural Elevation Visualizer**: Single SVG coordinate system (`PX_PER_CM = 1.6`) rendering a 3.0m room height, a 220×190cm window, and the ready-made curtain drape to metric scale beside a 175cm human silhouette.
- **Ambient Room Light**: Dynamic warm overlay (`mix-blend-mode: soft-light`) scaling with daylight transmission through the curtain weave, with a minimum ambient floor so the room never falls completely dark.
- **Continuous Openness Control**: Accessible `<input type="range">` with custom focus rings, `motion-reduce:transition-none` safeguards, and clear text feedback for screen readers.
- **Direct WhatsApp / Phone Handoff**: Dedicated CTA buttons that bypass cart/checkout and generate a pre-formatted stock confirmation inquiry.

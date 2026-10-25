# Tari

A product catalogue for ready-made curtains, sold in Kenya. Customers browse, preview each curtain to scale with a daylight simulation, then order by WhatsApp or phone call. There is no cart or online payment.

## Package Manager

- pnpm

## Business rules the code depends on

- Products are ready-made with fixed sizes and fixed KES prices.
- Stock is confirmed by phone or WhatsApp. The order buttons stay active whatever the stock label says.
- Nationwide delivery. Do not add other claims (installation, custom sizing, delivery times) until the owner confirms them.
- Anything customer-facing that the owner hasn't confirmed is marked `TODO confirm with owner`.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # then fill in the values
pnpm dev
```

Environment variables (`.env.local`, never committed):

| Variable                        | Purpose                                                          |
| ------------------------------- | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL                                             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (safe for browsers; protected by RLS)            |
| `TODO`                          | Owner phone / WhatsApp number (currently a placeholder constant) |

The service-role key is not used anywhere and must never be added to client code.

Do not run `pnpm build` while `pnpm dev` is running in the same folder. If styles vanish, stop the server, delete `.next`, and restart.

## Database

Migrations live in `supabase/migrations/` and run in filename order. Apply them with the Supabase CLI or paste them into the SQL editor.

First-time owner setup:

1. In Supabase, disable public email signups (Authentication settings).
2. Create the owner user in the dashboard.
3. Insert their ID into the admin table: `insert into admins (user_id) values ('<owner uuid>');`

Key design decisions:

- Products have a `status` (`draft`, `published`, `archived`). Nothing is hard-deleted.
- Public visitors can read published and archived products. Drafts are hidden.
- Only users listed in `admins` can write to products, images, slug history and storage.
- Renaming a product slug goes through the `rename_product_slug` function, which records the old slug so old links permanently redirect.
- Images are resized in the browser (max 1600px WebP) and uploaded straight to Storage under `products/{product_id}/{uuid}.webp`.

### Testing RLS

Run `supabase/tests/rls.sql` after every migration. Every denial test must be paired with a success test using the same statement, because a blocked write often returns zero rows without an error.

## Owner admin

- `/admin/login`, then `/admin/products` (mobile-first).
- One-tap stock toggle, create and edit products, upload photos, publish, archive, rename slug.
- Publishing requires at least one photo.
- Every server action re-checks the logged-in user and admin membership; the proxy redirect is a convenience, not the security.

## Curtain preview

The visualizer is a single SVG scene drawn to scale from the product's width and drop in cm

## Design tooling (optional, not part of the app)

The UI was built with AI-agent skills. They are not committed. To set them up on a new machine:

```bash
npx impeccable install
npx skills@latest add emilkowalski/skills
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"
```

Project context for the agent lives in `PRODUCT.md`, `DESIGN.md` and `.impeccable/`. Deferred work is in `TODO.md`.

## Deployment checklist

- [ ] Environment variables set on the host
- [ ] Supabase Auth Site URL and redirect URLs set to the live domain
- [ ] Email signups still disabled
- [ ] Real owner phone and WhatsApp numbers in place
- [ ] Placeholder and test products removed
- [ ] `pnpm build` passes from a clean `.next` with no internet-only font downloads
- [ ] Owner flow tested on the live site from a phone (login, add product with photo, publish, view in incognito)

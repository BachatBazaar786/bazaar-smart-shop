# Phase 5 — Turn 1: Admin Foundation

Extends the existing schema, RLS, server functions, and TanStack Query architecture. Nothing is duplicated or replaced.

## Scope for this turn

Foundation-first. CMS depth = structured content model. Media Library = Cloud Storage buckets. Blog / coupons / page builder deferred to Phase 6.

## 1. Route protection & admin shell

- New route gate `src/routes/_admin/route.tsx` (`ssr: false`, `beforeLoad` calls `supabase.rpc('is_admin', { _user_id })`, redirects non-admins to `/`).
- Server-side guard on every admin server fn via a new `requireAdmin` middleware that reuses `requireSupabaseAuth` + `has_role` RPC (already exists).
- Admin layout with sidebar (Dashboard, Orders, Products, Categories, Brands, Tags, Customers, Inventory, Media, CMS, Settings), top bar, breadcrumbs. Fully responsive with existing shadcn `Sidebar`.
- Header gets an "Admin" link when `is_admin` is true.

## 2. Dashboard `/admin`

KPI cards + charts (recharts, already available):

- Revenue: total, today, 7d, 30d, YTD (from `orders` where `payment_status='paid'`)
- Orders by status (pending/processing/shipped/delivered/cancelled)
- Customers: total, new 30d, returning (>=2 orders)
- Inventory: total value (`SUM(price * stock)`), low-stock (<10), out-of-stock counts
- Top 10 best-selling products (from `order_items`)
- Revenue by category / brand (join order_items → products)
- Recent 10 orders, recent 10 customers
- Line chart: daily revenue last 30d. Bar chart: orders per status.

All aggregations via new `admin_dashboard_stats` SECURITY DEFINER RPC returning JSON — one round trip.

## 3. Orders `/admin/orders`

Reuses existing `listOrdersAdmin`, `admin_update_order_status`, `refund_order_stock`.

- Table with search (order#, email), filters (status, payment status, date range), pagination.
- Detail drawer: items, shipping address, status timeline (`order_status_history`), payment info, notes.
- Actions: change status, mark paid/refunded, cancel (auto refunds stock via existing RPC), add internal note.
- Printable invoice + packing slip (print-friendly route `/admin/orders/$id/invoice`).

## 4. Products `/admin/products`

Full CRUD extending `products`, `product_images`, `product_specifications`.

- List: search, filter by category/brand/status/stock, sort, pagination, bulk select.
- Editor: all fields (name, slug auto-gen, SKU, price, sale_price, stock, status, featured/best_seller/new_arrival/on_deal, tags, benefits, description, short_description, usage), image gallery (drag-reorder, upload to `product-images` bucket), specifications editor, SEO fields.
- Actions: duplicate, bulk delete, bulk price update (%/fixed), bulk stock update, CSV import/export.

## 5. Categories / Brands / Tags

- `/admin/categories`: CRUD + image upload + sort_order drag + active toggle + SEO. Adds `parent_id UUID NULL` for nested categories (single-level nesting sufficient; UI supports tree).
- `/admin/brands`: CRUD + logo + banner + description + SEO. Extends `brands` with `description`, `banner_url`, `seo_title`, `seo_description`.
- `/admin/tags`: new `tags` table (name, slug) with junction `product_tags(product_id, tag_id)`. Migrates existing `products.tags` text[] into the normalized table (kept in sync via triggers, existing column preserved for backward compat).

## 6. Customers `/admin/customers`

- List from `profiles` + `auth.users` (email via `admin_list_customers` RPC that joins securely).
- Detail: profile, addresses, order history, wishlist count, role, admin notes.
- Actions: promote/demote role (super_admin only), add note (new `customer_notes` table).

## 7. Inventory `/admin/inventory`

- Stock overview: current stock per product, value, status badges.
- Manual adjustment form (writes to new `stock_movements` table: product_id, delta, reason, note, created_by, created_at).
- Low-stock / out-of-stock views.
- CSV import/export.

## 8. Media Library `/admin/media`

- Two Cloud Storage buckets: `product-images` (public), `media` (public). RLS: public SELECT, admin-only INSERT/UPDATE/DELETE via `is_admin(auth.uid())`.
- Grid view with upload (drag-drop, multi-file), preview, rename (copy+delete), delete, bulk delete, search, folder prefixes.
- Image picker component reused by product/category/brand/CMS forms.
- Client-side compression via `browser-image-compression` before upload.

## 9. Site CMS `/admin/cms` (structured)

New `site_content` table: `(section_key TEXT PK, data JSONB, updated_at, updated_by)`. Admin editors per known section:

- Announcement bar (messages array)
- Header (logo, nav items, mega-menu)
- Footer (columns of links, social links, copyright, newsletter blurb)
- Homepage (hero title/subtitle/CTA/image, featured category ids, featured product ids, promo banners, testimonials)
- Static pages: about, contact, privacy, terms, shipping-policy, refund-policy, 404 (title, body rich-text via Tiptap-lite, SEO)
- Global SEO defaults + JSON-LD org fields

Frontend routes read via `getSiteContent(key)` server fn with TanStack Query, falling back to sensible defaults so nothing breaks pre-edit.

## 10. Settings `/admin/settings`

- General: site name, tagline, contact email/phone, address
- SEO: default title template, description, OG image, GSC verification token, GA4 id
- Commerce: currency (locked to PKR), tax %, shipping flat rate, free-shipping threshold
- Social links
- Favicons/logo (Media Library picker)

Stored in `site_settings` table (single-row keyed).

## 11. Reports (light)

- CSV export buttons on orders, products, customers, inventory. Full reports module (PDF, charts export) → Phase 6.

## Database migrations (single migration)

New tables (all with GRANTs, RLS, admin-only policies via `is_admin`):
- `tags`, `product_tags`
- `stock_movements`
- `customer_notes`
- `site_content`
- `site_settings`

Alterations:
- `categories`: add `parent_id`, `seo_title`, `seo_description`
- `brands`: add `description`, `banner_url`, `seo_title`, `seo_description`

New RPCs (SECURITY DEFINER, EXECUTE revoked from anon, granted to authenticated + admin-checked internally):
- `admin_dashboard_stats()` → JSONB
- `admin_list_customers(_search, _limit, _offset)`
- `admin_adjust_stock(_product_id, _delta, _reason, _note)`

## Out of scope (Phase 6)

Blog, coupons, visual page builder, PDF reports, product variants, barcode scanning, most-viewed/most-wishlisted analytics (needs event tracking), email settings UI (Resend already wired).

## Technical notes

- All admin server fns: `.middleware([requireSupabaseAuth])` + inline `has_role(userId, 'admin' | 'super_admin')` check; safeError wrapper for all throws.
- All admin queries use TanStack Query with keys under `['admin', ...]` for isolated invalidation.
- All admin routes under `_admin/` layout (client-only gate), file naming `_admin.orders.tsx`, `_admin.products.tsx`, etc.
- Charts: recharts (add if missing).
- Rich text: `@tiptap/react` + starter-kit (add).
- CSV: `papaparse` (add).
- Image compression: `browser-image-compression` (add).

## Deliverable

At the end of this turn: fully working, gated admin panel covering commerce (orders/products/categories/brands/tags/customers/inventory), media library with real Cloud Storage, structured site CMS editing homepage/header/footer/policies, and site settings. Build + typecheck clean. No mock data. Phase 6 will add blog, coupons, page builder, and deep reports.

# Visitor catalog performance

Public catalog HTML, JSON, and product photos are cached so repeat visitors do not hit SQLite on every request. Admin writes stay uncached and invalidate those tags.

## Cache windows

| Surface | Policy |
| --- | --- |
| Catalog / projects / contact HTML | `export const revalidate = 120` on public pages and the root layout |
| Server `fetch` to Express | `{ next: { revalidate: 120, tags } }` in [`sqlite-api.ts`](../frontend/src/lib/sqlite-api.ts) |
| Public Next GET proxy (`/api/products`, types, series, projects) | Same 120s tags; `Cache-Control: public, s-maxage=120, stale-while-revalidate=600` |
| Product / AI image routes | `Cache-Control: public, max-age=3600, stale-while-revalidate=86400` plus `ETag` from mtime+size |
| Admin `/api/admin/backend/*` | `cache: 'no-store'`. After a successful POST/PUT/PATCH/DELETE, [`revalidateAfterAdminWrite`](../frontend/src/lib/catalog-revalidate.ts) runs |

Tags: `catalog` (products, types, series, uploads), `projects`, `contact`.

Do not add `_nocache` query params on public catalog reads. Admin image preview may still append `?t=` via `resolveProductDisplaySrc`.

## List vs detail JSON

- `GET /api/products`, `GET /api/products/featured`, and nested series `products.data` use `serializeProductListItem` (card fields only).
- Filters: `q` (name / description / product_code), `series` or `filters[series][slug]`, `filters[product_type][slug]`. Type filter matches `product_type_id` or any series in that type.
- `GET /api/products/by-slug/:slug`, `by-path`, and `:id` still use full `serializeProduct`.

Search (`/search?q=`) calls `GET /api/products?q=` instead of downloading the catalog in the browser.

## Images

[`/images/products/[...path]`](../frontend/src/app/images/products/[...path]/route.ts) still reads from disk so admin uploads show without restarting `next dev`. It is no longer `no-store`. Catalog cards use `next/image` through [`RobustImage`](../frontend/src/components/ui/robust-image.tsx) and [`ProductCard`](../frontend/src/components/products/ProductCard.tsx). Missing files fall back to [`/images/products/general/placeholder-project.jpg`](../frontend/public/images/products/general/placeholder-project.jpg).

The home hero file is [`frontend/public/hero-image.jpg`](../frontend/public/hero-image.jpg) (`/hero-image.jpg`), not `/images/hero-image.jpg`. Next also sets `Cache-Control: public, max-age=3600, stale-while-revalidate=86400` on `/images/products/*` and `/images/ai/*` so files served from `public/` stay cacheable.

## Hosting (out of this repo)

Put gzip/HTTP/2 and an edge cache (nginx or Cloudflare) in front of Next in production. Express already compresses JSON. Inter is self-hosted at build time via `next/font/google`.

# 404 pages

Unknown catalog URLs use a LEVO-styled not-found page instead of the default Next.js 404 (the generic “This page could not be found.” block, which also forced a dark page).

## Files

| Route | File |
|-------|------|
| Any unmatched public URL | [`frontend/src/app/not-found.tsx`](../frontend/src/app/not-found.tsx) |
| Missing product category | [`frontend/src/app/products/[type]/not-found.tsx`](../frontend/src/app/products/[type]/not-found.tsx) |
| Missing product series | [`frontend/src/app/products/[type]/[series]/not-found.tsx`](../frontend/src/app/products/[type]/[series]/not-found.tsx) |
| Missing product (page still returns the product route) | [`ProductDetails` parent page](../frontend/src/app/products/[type]/[series]/[slug]/page.tsx) |
| Missing project | [`frontend/src/app/projects/[slug]/not-found.tsx`](../frontend/src/app/projects/[slug]/not-found.tsx) |
| Missing admin product / project / inquiry | `/admin/products/[id]`, `/admin/projects/[id]`, `/admin/inquiries/[id]` |

Shared layout: [`frontend/src/components/layout/NotFoundView.tsx`](../frontend/src/components/layout/NotFoundView.tsx). Buttons use `btn-primary` / `btn-secondary`. Category shortcuts are loaded from `/api/product-types`, not hardcoded.

## Help tips

`catalog.404.home`, `catalog.404.products`, `catalog.404.projects`, `catalog.404.contact`, `catalog.404.category`, `admin.404.products`, `admin.404.projects`, `admin.404.inquiries`, `admin.404.dashboard`.

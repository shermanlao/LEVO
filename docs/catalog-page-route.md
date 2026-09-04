# Catalog page route

Public product and project pages share a slash breadcrumb (`Products / Downlights`) instead of a Home + chevron trail.

## Component

- UI: [`frontend/src/components/layout/PageRoute.tsx`](../frontend/src/components/layout/PageRoute.tsx)
- Helpers: [`frontend/src/components/layout/pageRouteItems.ts`](../frontend/src/components/layout/pageRouteItems.ts)

Optional `end` slot sits on the same row as the crumbs (used for the small-screen funnel).

Import the helpers from `pageRouteItems` (not from the client `PageRoute` file) so server pages can build the trail. Pass `items` so labels stay consistent:

- `productRouteItems()` — `/products`
- `productRouteItems({ type })` — `/products/[type]`
- `productRouteItems({ type, series })` — `/products/[type]/[series]`
- `productRouteItems({ type, series, product })` — product detail
- `projectRouteItems()` — `/projects`
- `projectRouteItems({ name })` — `/projects/[slug]`
- `resourceRouteItems(label)` — `/warranty`, `/certifications`, `/technical` (`Home / {title}`)

Product detail also has a thin wrapper: [`frontend/src/components/products/Breadcrumb.tsx`](../frontend/src/components/products/Breadcrumb.tsx).

The last crumb is the current page (semibold, no link). Earlier crumbs are links. Root crumbs **Products** and **Projects** use `HelpLink`.

Vertical space above the breadcrumb comes from the root layout `main` (`py-4`) plus the page wrapper (`py-4` / `pt-4` on catalog pages). Do not add another `py-8` on those wrappers.

## Catalog pages

- `/products` — one card per **product type** (category).
- `/products/[type]` — one card per **series** in that type. The photo is the series 16:9 catalog crop (`featured_image`) from `/admin/product-series`. Clicking a card opens `/products/[type]/[series]`. Wattage / CCT / beam / dimming filters live on this page (`ClientSideFilters`). Below `lg` a funnel icon sits on the same row as `Products / {type}`; tap to open filters (collapsed by default). From `lg` up the sidebar stays expanded. With an active filter, matching **products** are shown as cards instead of series cards. Toggle: `catalog.category.filter_toggle`. Clear: `catalog.category.filter_clear`.
- `/products/[type]/[series]` — Wever & Ducré-style gallery: main photo capped at 500px (`ImageCarousel`) on the left, series name, description, and variant selectors (`SeriesConfigurator`) on the right. The photo keeps its aspect ratio, sits at the top of the gallery (`object-top`), and lines up with the first thumbnail and the series name. Extra views are thumbs when there is more than one photo. Below `sm`, thumbs sit under the main photo so the gallery fits a narrow column; from `sm` up they stay in a vertical strip beside it. Selectors: physical → electrical → optic → control (size, finish, trim, reflector, IP, wattage, CCT, beam, dimming, plus any other spec) — only when that spec has two or more values (labels only — no help `?` beside each field). A single stored value is applied automatically and hidden. Below `lg` the selectors collapse behind a funnel on the breadcrumb row (`Products / {type} / {series}`), same pattern as the category page; tap to expand a filter-style panel under the crumbs. Filled selectors filter the SKU table below and, when every visible option is chosen, generate a custom datasheet / LDT. **Family Datasheet** and **Installation** sit on the series title row (one installation PDF for the series). Then the SKU list (`ProductList`): from `lg` up, a **table** (image, SKU, wattage, size when present, CCT with a Kelvin swatch, beam with a cone icon, dimming, finish with a colour swatch when present, and Datasheet / LDT downloads); below `lg`, stacked rows with the same spec icons under the SKU (including size and finish) and wrapping file buttons. The series name is not repeated in each row. Clicking a SKU or thumbnail opens `ProductSkuDialog` instead of navigating away: one photo carousel (product, size drawing, polar from the selected beam) beside the spec table; from `lg` up, Datasheet / Installation / LDT in the header; below `lg`, those three file buttons pinned to the dialog footer. LDT on each row is generated for that combination (`GET /api/series/:slug/ldt`). List thumbnails fall back to the series photo when a SKU has no image.

## Help tips

`catalog.breadcrumb.home`, `catalog.breadcrumb.products`, `catalog.breadcrumb.category`, `catalog.breadcrumb.series`, `catalog.breadcrumb.projects`, `catalog.category.filter_toggle`, `catalog.category.filter_clear`, `catalog.datasheet.download`, `catalog.family_datasheet.download`, `catalog.ldt.download`, `catalog.installation.download`, `catalog.series.filter_toggle`, `catalog.series.wattage`, `catalog.series.size`, `catalog.series.cct`, `catalog.series.beam`, `catalog.series.dimming`, `catalog.series.colour`, `catalog.series.trim_color`, `catalog.series.reflector_finish`, `catalog.series.clear`, `catalog.series.sku_preview`, `catalog.series.sku_close`.

# Partner catalog import (LightX)

LEVO **pulls** products from LightX’s read-only external API. Partner credentials never go to the browser.

## Setup

1. Run frontend + API: `npm run dev` from the repo root (starts both).
2. Sign in at `/admin` (see [admin-login.md](admin-login.md)).
3. Open **Partner catalog (LightX)** (`/admin/external-catalog`).
4. Save base URL (default `https://lightx.synology.me/api/external/v1`), API key, and API password.
5. Click **Test connection**.

Credentials are stored in `external_catalog_sources` (SQLite locally, PostgreSQL in production). The password is not returned after save.

## Import products

1. Open a series at `/admin/product-series/[id]` (type and series are already set). `/admin/products` redirects here.
2. Use **Import from partner**.
3. Search, tick rows, **Import selected**. Use **First / Previous / page numbers / Next / Last**, or **Go to** a page, to move through the partner catalog (the API returns 20 rows per page).
4. Unique spec values are merged into `series_options`. Photos copy onto the matching **size pack** when that pack is missing them. Import does not create one product row per LightX article.

LightX `category.name` is **not** a LEVO category. Import never creates a new product type (that is why an “Imported” card used to appear on `/products`).

Import never creates a series from the partner brand. You must pick an existing LEVO series. Products already imported under a brand series (e.g. LIGHTX) stay there until you reassign them in admin.

Public names and SKUs are LEVO-owned. See [product-codes.md](product-codes.md).

## Field map

| LightX | LEVO |
|--------|------|
| `article` / `vendorProductCode` | `vendor_code` (admin) |
| `model` | `vendor_model` (admin) |
| *(generated)* | series `product_code` is unchanged; size pack name is `{series} {size}` |
| `wattage`, `lumen`, `colorTemperature`, `beamAngle`, `control` | `wattage`, `lumen`, `cct`, `beam_angle`, `dimming` |
| `ipRating`, `size`, `cutHole`, `mounting`, `cri`, `driver`/`driverType`, `powerFactor`, `lamp`, `finish` | matching spec columns |
| *(admin pick at import)* | existing product type **and** series |

Imported articles merge variants onto the chosen series and fill size-pack photos. Public URLs are `/products/{type-slug}/{series-slug}`. Brand, vendor company, and origin are not shown on the catalog page. See [series-configurator.md](series-configurator.md).

## Image mask

Imported photo files stay on LightX, but visitors never see that host. The API rewrites remote image fields to same-origin paths:

`/api/product-media/{productId}/main_image_A`

LEVO’s server fetches the stored LightX URL and streams the bytes. The browser Network tab only shows the LEVO site (port 3000). Specs still live in SQLite.

The first request for a photo is cached on disk (`backend-server/cache/product-media`) and in memory. Concurrent requests for the same file share one LightX download. Opening a product page also warms those files in the background after the JSON response, so the gallery often hits cache. The product gallery (`ImageCarousel`) renders `<img src="/api/product-media/...">` immediately from the product JSON — it does not HEAD-probe paths first (that used to download each LightX file twice and keep the spinner up).

Admin search thumbnails on `/admin/products` use the same idea:

`/api/admin/external-catalog/photo/{lightxProductId}`

Next.js checks the admin session, then proxies the JPEG/PNG bytes from Express without decoding them as text. Express fetches the LightX file with the stored API key/password.

`featured_image` in the public product JSON is a Strapi-style object; other image fields are path strings. Admin edit and the carousel unwrap both with `extractImageSrc` / `resolveProductDisplaySrc` and keep `/api/product-media/...` as-is (do not prepend `/images/` or append `.jpg`). Express fetches the stored LightX file with the catalog API key/password.

## API (session required)

Browser calls Next.js, which proxies to Express:

- `GET/PUT /api/admin/external-catalog/settings`
- `POST /api/admin/external-catalog/settings/test`
- `GET /api/admin/external-catalog/products?search=&page=&limit=`
- `POST /api/admin/external-catalog/import` body `{ "ids": ["…"], "product_type_id": 1, "series_id": 2 }` (`series_id` required)

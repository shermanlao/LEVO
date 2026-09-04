# LEVO guides

- [Admin login](docs/admin-login.md) — `/admin` session, SQLite staff logins, and Product Types → Series → Variants dashboard layers
- [Admin dashboard](docs/admin-dashboard.md) — stats tiles, shortcuts, and attention counts on `/admin`
- [Site settings](docs/admin-site-settings.md) — `/admin/settings` brand logos, homepage copy, contact/footer, and SEO
- [Visitor analytics](docs/visitor-analytics.md) — first-party `levo_vid` cookie and 7-day unique visitors / page views
- [Admin users](docs/admin-users.md) — admin vs staff roles and `/admin/users`
- [Partner catalog import](docs/partner-catalog-import.md) — LightX read-only fetch, search, and bulk import into an existing LEVO category and series on `/admin/products`
- [Product codes](docs/product-codes.md) — LEVO SKUs (`DL00007`), vendor_code, and spec-based public names
- [Public product catalog API](docs/product-catalog-api.md) — by-slug / by-path routes and Strapi-like product JSON
- [Series variant configurator](docs/series-configurator.md) — series option lists (including size), series page selectors, custom datasheet / LDT / installation
- [Appearance photos](docs/appearance-photos.md) — Finish / Trim / Reflector photos generated at staff upload, N/A when a part is missing
- [Variant options](docs/variant-options.md) — global spec option labels, SKU codes, and datasheet badge artwork (`/admin/variant-options`)
- [Contact Us page](docs/contact-page.md) — `/contact` page, seeded contact details, inquiry form API, and `/admin/inquiries`
- [Resource pages](docs/resource-pages.md) — footer Resources / Media columns and staff-editable `/warranty`, `/certifications`, `/technical`
- [Product datasheets](docs/product-datasheet.md) — generated LEVO datasheet and installation PDFs (`/api/datasheets/:slug`, `/api/datasheets/:slug/installation`)
- [Product labels](docs/product-label.md) — printable SKU and brand sticker PDFs from `/admin/products` (`/api/labels/:slug`, `/api/labels/general`)
- [Security improvement plan](docs/security-improvement-plan.md) — auth boundary, uploads, XSS/SSRF, and production secret cutover
- [404 pages](docs/not-found-page.md) — LEVO-styled not-found page for missing catalog, project, and admin records
- [Site branding](docs/site-branding.md) — LEVO wordmark, LIGHT EVOLUTION slogan, tab icon, and datasheet PDF chrome
- [Photometric LDT](docs/photometric-ldt.md) — beam library, saved polar options, public LDT download (product detail and series list), polar drawing on the datasheet
- [Product photo AI](docs/product-photo-ai.md) — size drawing generate/refine and main-photo AI edit
- [Admin AI settings](docs/admin-ai-settings.md) — `/admin/ai` keys, routing, failover, usage, size-drawing prompts and style reference
- [Catalog page route](docs/catalog-page-route.md) — shared `Products / …` and `Projects / …` breadcrumb on public product and project pages
- [Frontend UI](docs/frontend-ui.md) — CSS tokens, Button/FormField/Card, and helpKey
- [Image crop board](docs/image-cutboard.md) — contain-start cutboard; series featured image is one source plus 16:9 / 4:5 / 1:1 crops
- [Shared modules](docs/shared-modules.md) — product specs, slugify, API clients, Express helpers

## Run locally

From the repo root:

- Frontend + API: `npm run dev`
- Frontend only: `npm run dev:frontend`
- API only: `npm run dev:backend`

SQLite file used by the API: `backend-server/database.sqlite`

# SEO and marketing (public site)

How the public catalog is exposed to search engines and social shares. Staff edit default title, description, Open Graph image, and About copy on `/admin/settings`. Per-category, per-series, and per-project SEO snippets are optional on those admin editors.

## Go-live checklist

1. Pick **one** public host (`https://levolight.com` or `https://www.levolight.com`). 301 the other to it. Set `SITE_ORIGIN` (and Next `SITE_ORIGIN` / `NEXT_PUBLIC_SITE_URL` if used) and the Site settings **Website** field to that same URL (no trailing slash).
2. On `/admin/settings`, uncheck **UNDER CONSTRUCTION for visitors**.
3. Confirm default SEO title / description and upload an Open Graph image if you want a branded share card.
4. Fill About title/body, contact details, and LinkedIn (and other social URLs you use).
5. In [Google Search Console](https://search.google.com/search-console), verify the property and submit `https://YOUR-HOST/sitemap.xml`.
6. Spot-check `/robots.txt` (should allow `/` and disallow `/admin`, `/api`, `/_next`, `/search`) and a series page title/description in the browser tab and “View source”.

While under construction is on, `robots.txt` disallows all paths and root metadata is `noindex`, so crawlers should not index the construction page.

## Technical surfaces

| Piece | Location |
|-------|----------|
| `robots.txt` | [`frontend/src/app/robots.ts`](../frontend/src/app/robots.ts) |
| `sitemap.xml` | [`frontend/src/app/sitemap.ts`](../frontend/src/app/sitemap.ts) |
| Default metadata + Organization / WebSite JSON-LD | [`frontend/src/app/layout.tsx`](../frontend/src/app/layout.tsx) |
| Page helpers | [`frontend/src/lib/seo.ts`](../frontend/src/lib/seo.ts), [`frontend/src/lib/seo-jsonld.ts`](../frontend/src/lib/seo-jsonld.ts), [`JsonLd`](../frontend/src/components/layout/JsonLd.tsx) |
| Admin `noindex` | [`frontend/src/app/admin/layout.tsx`](../frontend/src/app/admin/layout.tsx) |
| Search `noindex` | [`frontend/src/app/search/layout.tsx`](../frontend/src/app/search/layout.tsx) |

### Sitemap contents

Static: `/`, `/products`, `/projects`, `/contact`, `/about`, `/warranty`, `/certifications`, `/technical`.

Dynamic: browsable product types (with at least one series), series at `/products/{type}/{series}`, project slugs. SKU paths are **not** listed (they redirect to the series). When under construction, only `/` is listed.

### Metadata rules

- Title template: `%s | {company_name}` from site settings. Homepage and site default use the absolute SEO title.
- Canonical URLs omit query strings (`?size=`, filters).
- Series / category / project meta prefer optional `seo_title` / `seo_description`, then strip HTML from the public description.
- Series Open Graph image uses the 16:9 catalog crop; projects use the thumbnail; home uses the site OG (or hero) image.
- Twitter card: `summary_large_image` on pages that set images.

### JSON-LD

- Layout: `Organization` + `WebSite` (social URLs as `sameAs` when set).
- Series: `Product` + `BreadcrumbList`.
- Category / products / projects / about / project detail: `BreadcrumbList` where applicable; project detail also emits `CreativeWork`.

## Marketing surfaces tied to SEO

- **About** — `/about` from `about_title` / `about_body` on site settings (header + footer Quick Links).
- **Inquire** — series title row links to `/contact?series={slug}`; the contact form prefills a datasheet / LDT request message.
- **LinkedIn** — shown in the footer Media column when `social_linkedin` is set (with Facebook, Instagram, Threads, Pinterest).
- **Datasheet QR** — still points at the series page (see [product-datasheet.md](product-datasheet.md)); keep Website / `SITE_ORIGIN` aligned so QR and canonicals match.

## Ops (not in app)

- Search Console verification and sitemap submit.
- Optional GA4 / Plausible after launch (first-party visitor counts remain; see [visitor-analytics.md](visitor-analytics.md)). Cookie notice if you target EU/UK.
- Do not create indexable pages per SKU combination.

Related: [admin-site-settings.md](admin-site-settings.md), [contact-page.md](contact-page.md), [hostinger-domain.md](hostinger-domain.md), [resource-pages.md](resource-pages.md).

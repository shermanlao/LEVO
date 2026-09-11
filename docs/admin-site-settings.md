# Site settings

Staff edit brand, homepage, contact, and SEO at `/admin/settings`. The dashboard **Settings** card opens this page. Admin and staff can use it.

## What it stores

SQLite `site_contacts` remains the public singleton (`GET /api/contact`). New columns cover:

- **Brand** — `company_name`, `company_short_name`, `slogan`, `logo_header`, `logo_pdf`, `logo_icon`
- **Homepage** — hero title/subtitle/CTA/image, featured headings, Why Choose heading and `why_cards` JSON
- **Public site** — `public_under_construction` (default on). Signed-out visitors see header, footer, and UNDER CONSTRUCTION on public pages (cone, pendant-light, and hard-hat icons above the heading). `/admin/login` and the rest of `/admin` always render the real admin UI so staff can sign in. Staff who are signed in see the full catalog. Uncheck it on `/admin/settings` when the site goes live.
- **Contact and footer** — existing contact fields plus social URLs (`social_linkedin`, `social_facebook`, `social_instagram`, `social_threads`, `social_pinterest`). The footer Contact Us column shows email, phone, address, and website only when that field has a value. The Media column shows LinkedIn, Facebook, Instagram, Threads, and Pinterest when a URL is set. Empty fields stay hidden. **Website** is also the public catalog origin encoded in datasheet QR codes.
- **Resources** — title and body for the public `/warranty`, `/certifications`, and `/technical` pages (`resource_warranty_title` / `resource_warranty_body`, and the same pair for certifications and technical). Footer label for the third link stays **Technical Underneath**.
- **About** — `about_title` and `about_body` for the public `/about` page (header and footer Quick Links).
- **SEO** — `seo_title`, `seo_description`, `og_image`. Defaults are architectural-LED oriented. See [seo.md](seo.md) for robots, sitemap, and the go-live checklist.

Empty logo/hero/icon paths use the built-in LEVO files (`/images/levo-logo-mark.png`, `/hero-image.jpg`, `frontend/src/app/icon.svg`). Uploads write to `/images/site/{slot}.{ext}`. Each slot accepts drop, clipboard paste, or a chosen file, then opens the crop board at its public frame (wordmark 3:1, icon 1:1, hero 3:2, Open Graph 1.91:1).

Featured products stay on `/admin/products` (`is_featured`). Featured projects use `projects.is_featured` on `/admin/projects`. The homepage hides the projects section when none are featured.

## APIs

Public:

- `GET /api/contact` — full site settings payload (including brand, homepage, social, resource copy, About, SEO)

Admin session (`/api/admin/site-settings` → Express `/api/site-settings`):

- `GET /api/admin/site-settings`
- `PUT /api/admin/site-settings` — text fields and `why_cards`
- `POST /api/admin/site-settings/logo` — multipart `file` + `slot` (`header` | `pdf` | `icon` | `hero` | `og`)
- `DELETE /api/admin/site-settings/logo?slot=`

Saving revalidates catalog, projects, and contact cache tags.

## Public wiring

- Header/footer logos and company name: [`Logo.tsx`](../frontend/src/components/layout/Logo.tsx), [`Footer.tsx`](../frontend/src/components/layout/Footer.tsx)
- Resource pages (Warranty, Certifications, Technical Underneath): [resource-pages.md](resource-pages.md)
- Homepage hero, Why Choose, featured headings: [`frontend/src/app/page.tsx`](../frontend/src/app/page.tsx)
- About page: [`frontend/src/app/about/page.tsx`](../frontend/src/app/about/page.tsx)
- Default metadata, Open Graph, tab icon, Organization JSON-LD: [`frontend/src/app/layout.tsx`](../frontend/src/app/layout.tsx)
- Datasheet/label PDFs and LDT company: `logo_pdf` then `logo_header`, plus `company_name` / `company_short_name`

Optional `seo_title` / `seo_description` also exist on product types, series, and projects (admin editors). Empty falls back to name + description. Full crawl/share behavior: [seo.md](seo.md).

Seeded defaults match the previous hardcoded copy (`ensureDefaultSiteContact` / `DEFAULT_*` in [`siteSettings.ts`](../backend-server/src/lib/siteSettings.ts)), except SEO title/description which use the stronger architectural-LED defaults (old short defaults are upgraded on API start when still present).

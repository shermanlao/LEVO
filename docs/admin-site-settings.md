# Site settings

Staff edit brand, homepage, contact, and SEO at `/admin/settings`. The dashboard **Settings** card opens this page. Admin and staff can use it.

## What it stores

SQLite `site_contacts` remains the public singleton (`GET /api/contact`). New columns cover:

- **Brand** — `company_name`, `company_short_name`, `slogan`, `logo_header`, `logo_pdf`, `logo_icon`
- **Homepage** — hero title/subtitle/CTA/image, featured headings, Why Choose heading and `why_cards` JSON
- **Contact and footer** — existing contact fields plus social URLs (`social_linkedin`, `social_facebook`, `social_instagram`, `social_threads`, `social_pinterest`). The public footer Media column shows Facebook, Instagram, Threads, and Pinterest when a URL is set (empty URLs stay hidden). LinkedIn stays in the database and admin form but is not in that Media column. **Website** is also the public catalog origin encoded in datasheet QR codes.
- **Resources** — title and body for the public `/warranty`, `/certifications`, and `/technical` pages (`resource_warranty_title` / `resource_warranty_body`, and the same pair for certifications and technical). Footer label for the third link stays **Technical Underneath**.
- **SEO** — `seo_title`, `seo_description`, `og_image`

Empty logo/hero/icon paths use the built-in LEVO files (`/images/levo-logo-mark.png`, `/hero-image.jpg`, `frontend/src/app/icon.svg`). Uploads write to `/images/site/{slot}.{ext}`. Each slot opens the crop board at its public frame (wordmark 3:1, icon 1:1, hero 3:2, Open Graph 1.91:1).

Featured products stay on `/admin/products` (`is_featured`). Featured projects use `projects.is_featured` on `/admin/projects`. The homepage hides the projects section when none are featured.

## APIs

Public:

- `GET /api/contact` — full site settings payload (including brand, homepage, social, resource copy, SEO)

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
- Default metadata, Open Graph, tab icon: [`frontend/src/app/layout.tsx`](../frontend/src/app/layout.tsx)
- Datasheet/label PDFs and LDT company: `logo_pdf` then `logo_header`, plus `company_name` / `company_short_name`

Seeded defaults match the previous hardcoded copy (`ensureDefaultSiteContact` / `DEFAULT_*` in [`siteSettings.ts`](../backend-server/src/lib/siteSettings.ts)).

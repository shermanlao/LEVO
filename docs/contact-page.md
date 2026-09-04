# Contact Us page

Public contact page at `/contact`. The previous About Us page at `/about` is temporarily redirected here.

## Public site

- Nav and footer **Contact Us** links go to `/contact`.
- `/about` redirects to `/contact`.
- Page copy (heading, intro, email, phone, address, hours, slogan) is loaded from the `site_contacts` table, not hardcoded in the page. Staff edit those fields on `/admin/settings`. See [admin-site-settings.md](admin-site-settings.md).
- Optional `website` and `datasheet_disclaimer` on the same row are used on generated product datasheets. `website` is the public catalog origin in the datasheet QR. `datasheet_disclaimer` is the footer tolerance note (25°C rated values, ±10% flux/load, ±150 K CCT). See [product-datasheet.md](product-datasheet.md).
- `slogan`, company name, logos, and social URLs on the same row also drive the header, homepage, footer, and datasheet PDF footers. The footer **Resources** column (Warranty, Certifications, Technical Underneath) and **Media** icons (Facebook, Instagram, Threads, Pinterest) also come from this row. See [site-branding.md](site-branding.md) and [resource-pages.md](resource-pages.md).
- The message form posts to `POST /api/contact/inquiries` and stores rows in `contact_inquiries`.

## Admin

Staff and admin can read submissions at `/admin/inquiries` (list) and `/admin/inquiries/[id]` (full message). Links on the dashboard inquiries tile, Projects card, and Needs attention row all open that list.

- `GET /api/admin/inquiries` — session required; proxies to Express `GET /api/contact-inquiries`
- `GET /api/admin/inquiries/:id` — session required; proxies to Express `GET /api/contact-inquiries/:id`

Those Express list routes are **not** in the public Next rewrites. Public visitors can only `POST` a new inquiry.

## API

- `GET /api/contact` — `{ data: { heading, intro, email, phone, address, hours, website, datasheet_disclaimer, slogan, company_name, logos, homepage, social, seo, … } }`
- `POST /api/contact/inquiries` — body `{ name, email, message }`
- `GET /api/contact-inquiries` — staff list (call through `/api/admin/inquiries`)
- `GET /api/contact-inquiries/:id` — one inquiry (call through `/api/admin/inquiries/:id`)

Contact details are seeded on API startup if the table is empty (`ensureDefaultSiteContact` in `backend-server/src/seed/ensureDefaults.ts`).

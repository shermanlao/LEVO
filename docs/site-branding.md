# Site branding

The public header uses a wordmark image, not typed company text. Staff can replace the wordmark, tab icon, PDF logo, company name, and slogan at `/admin/settings`. See [admin-site-settings.md](admin-site-settings.md).

Built-in fallbacks (used when an upload slot is empty):

- File: [`frontend/public/images/levo-logo-mark.png`](../frontend/public/images/levo-logo-mark.png) (trimmed wordmark). Original capture: `levo-logo.png`.
- Component: [`frontend/src/components/layout/Logo.tsx`](../frontend/src/components/layout/Logo.tsx)
- Slogan component: [`frontend/src/components/layout/BrandSlogan.tsx`](../frontend/src/components/layout/BrandSlogan.tsx)
- Used in the root header ([`frontend/src/app/layout.tsx`](../frontend/src/app/layout.tsx)) and [`Header.tsx`](../frontend/src/components/layout/Header.tsx). On `/admin` pages (not login), [`SiteNav`](../frontend/src/components/layout/SiteNav.tsx) keeps Home and shows Catalog, Projects, Settings, and Users with hover sub-menus. The same header always shows **Login** or **Log out** via [`HeaderAuthButton`](../frontend/src/components/layout/HeaderAuthButton.tsx) (`GET /api/admin/me`).
- Also shown on the homepage hero, contact heading, footer copyright bar, and generated datasheet / family datasheet / installation PDF footers. The public footer adds a **Resources** column (Warranty, Certifications, Technical Underneath) and a **Media** column of social icons when URLs are set. See [resource-pages.md](resource-pages.md).
- Datasheet, family datasheet, and installation PDFs draw `logo_pdf` (then `logo_header`, then the built-in wordmark) ([`backend-server/src/lib/datasheetPdf.ts`](../backend-server/src/lib/datasheetPdf.ts)). Datasheets also print a footer QR to the series page for that variant (see [product-datasheet.md](product-datasheet.md)). Family datasheets QR to the series page with no filters.
- Product and brand label PDFs use the same logo resolution ([`backend-server/src/lib/labelPdf.ts`](../backend-server/src/lib/labelPdf.ts); see [product-label.md](product-label.md))

`company_name`, `company_short_name`, `slogan`, and logo paths live on `site_contacts`. Public pages read them from `GET /api/contact`. Style tokens in `frontend/src/app/globals.css`: `.brand-slogan` (`.brand-slogan-hero` on large headings, `.brand-slogan-on-dark` when the slogan sits on a dark fill, `.brand-slogan-lockup` spreads the letters to the same width as the wordmark); `.brand-logo-mark` paints the header/footer wordmark with `currentColor` (`#000`) through a CSS mask so it stays black on the light site and only lightens when the browser remaps text (forced/auto dark). Do not invert on `prefers-color-scheme` — the catalog stays a light theme even when the OS is dark. Shared mark: `BrandLogoMark` in [`Logo.tsx`](../frontend/src/components/layout/Logo.tsx).

The public header and footer share `.site-chrome` (light grey `#E5E7EB`). Datasheet, family datasheet, and installation PDFs fill the same grey behind the header and footer bands.

## Tab icon

The default browser tab / favicon is a black rounded square with a white geometric **L**. An uploaded `logo_icon` on Site settings overrides it via `generateMetadata()`.

- [`frontend/src/app/icon.svg`](../frontend/src/app/icon.svg) — vector tab icon fallback
- [`frontend/src/app/icon.png`](../frontend/src/app/icon.png) — raster icon
- [`frontend/src/app/favicon.ico`](../frontend/src/app/favicon.ico) — `/favicon.ico`
- [`frontend/src/app/apple-icon.png`](../frontend/src/app/apple-icon.png) — Apple touch icon
- Copies: [`frontend/public/images/levo-icon.svg`](../frontend/public/images/levo-icon.svg), [`frontend/public/images/levo-icon.png`](../frontend/public/images/levo-icon.png)

The logo link `helpKey` is `catalog.logo`.

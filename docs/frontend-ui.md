# Frontend UI primitives

Shared layout tokens live in `frontend/src/app/globals.css`. React wrappers live in `frontend/src/components/ui/`.

Public pages sit in the root layout `main` (`py-4`). Catalog wrappers use matching `py-4` / `pt-4` so header-to-breadcrumb space stays tight (about 2rem total, not stacked `py-8`).

## Tokens

- `.btn-primary` — black fill, white text
- `.btn-secondary` — black border
- `.btn-danger` — red border and text (same padding as the other button tokens)
- `.option-tag` / `.option-tag-on` — compact variant chips (same black outline / black fill as the buttons)
- `.input-field` / `.input-field-sm` / `.select-field` — form controls (`.input-field-sm` is the compact Variant page row)
- `.admin-field-label` / `.admin-field-cell` / `.admin-field-value` — product editor grid
- `.alert-error` / `.alert-success` / `.alert-warning`
- `.card-panel` / `.table-wrap` / `.empty-state` / `.spinner`
- `.site-chrome` — light grey header/footer band (`--chrome-rgb: 229, 231, 235`)
- `.brand-slogan` — tracked uppercase brand tagline (`LIGHT EVOLUTION`). Variants: `.brand-slogan-hero`, `.brand-slogan-on-dark`, `.brand-slogan-lockup` (header: same width as the wordmark)
- `.brand-logo-mark` — header/footer wordmark. The PNG is a mask over `currentColor` (`#000`) so the mark matches header text on the light site and follows browser text remapping when the page is actually darkened. `BrandLogoMark` in `components/layout/Logo.tsx`.

Do not invent a third button color. Admin create/save actions use primary (black). Table row actions that should look like buttons use `secondary` (Variants / Edit / Duplicate) and `danger` / `.btn-danger` (Delete). Wrap those actions in `flex gap-2`. Ghost stays a text link (dashboard shortcuts, back links).

## Components

| Component | Use |
|-----------|-----|
| `Button` | User-facing control. Requires `helpKey`. Variants: `primary`, `secondary`, `danger`, `ghost`. Pass `href` for a link (`mailto:` / `tel:` use a native anchor). |
| `TextInput` / `SelectField` / `TextareaField` | Labeled fields using `.input-field` / `.select-field` |
| `Card` | White panel |
| `AlertBanner` | Error / success / warning |
| `AdminTable` | Admin list tables |
| `CatalogCard` | Hover card shell; `CategoryCard`, `SeriesCard`, `ProductCard` wrap it |
| `ProjectCatalog` | Public project cards. Pass `hideFilters` on the homepage featured section. |
| `ProductList` | Public series combination list (cartesian of series variants). From `lg` up: full-width `table-fixed` layout (image, wrapping SKU, then physical columns such as size / finish / trim / reflector / IP, then electrical / optic / control such as wattage / CCT / beam / dimming, then Datasheet / LDT). The SKU string uses that same segment order. SKU and size stay narrow so extra variant columns fit the browser width. CCT / beam / finish use `SpecValueIcons`. SKU text uses the same regular-weight grey as other spec cells. Below `lg`: stacked rows with the same spec values in the same physical-then-electrical-optic-control order. SKU and thumbnail open `ProductSkuDialog` for that combination. The series name is not repeated in the list (it is already in the page title). |
| `SpecValueIcons` | Catalog spec icons: Kelvin-tinted CCT circle, beam cone that widens with the angle, finish colour swatch (split circle for `Black/White`). Used by `ProductList`. |
| `SeriesGrid` | Series cards for homepage featured, search, and category pages. Count is cartesian option count. |
| `ProductSkuDialog` | Series-page overlay for a generated combination. Header: series name, equal-height Datasheet / Installation / LDT (series URLs; Installation is the family file), close. Left: datasheet images (product photo, size drawing, polar from the selected beam), compact type/series/spec badges, and the filled series phrase under the badges. Right: Series, SKU, spec table. Close via X, Escape, or backdrop. |
| `ImageCarousel` | Product / series gallery. The main (non-compact) photo is a **4:5** `object-cover` frame. Compact mode in `ProductSkuDialog` stays square. Zoom overlay close sits in the viewport safe area (not above the image) so it stays tappable on phones. |
| `SeriesFamilyTitle` | Series name plus **Family Datasheet** and **Installation** on the title row (`catalog.family_datasheet.download`, `catalog.installation.download`) |
| `SeriesConfigurator` | Series page layout: gallery left (4:5 main photo, max 400×500, top-aligned with thumbs and series name), compact name / Family Datasheet / Installation / description / variant selectors right (two-column dropdowns in physical → electrical → optic → control order, no instruction copy), then `ProductList` full width. Below `lg`, selectors collapse behind a funnel on the breadcrumb row (`catalog.series.filter_toggle`). A dropdown is shown only when that spec has two or more unique values (equivalent spellings such as `120` / `120°` count as one); a complete selection shows custom datasheet / LDT URLs. The title-row Family Datasheet opens `/api/series/:slug/family-datasheet`. Installation opens `/api/series/:slug/installation` (same PDF for every SKU). LDT and the datasheet polar follow the selected beam. |
| `CatalogFunnelToggle` | Funnel on the breadcrumb row for small screens. Category uses `catalog.category.filter_toggle`; series uses `catalog.series.filter_toggle`. Hidden from `lg` up. |
| `BrandSlogan` | `components/layout` — tracked uppercase slogan from `site_contacts.slogan` |
| `BrandLogoMark` | `components/layout/Logo.tsx` — header/footer wordmark painted with `currentColor` |
| `Footer` | Same-row columns: Contact Us, Quick Links, **Resources** (Warranty / Certifications / Technical Underneath, stacked like Quick Links), and **Media** icons when URLs are set (Facebook, Instagram, Threads, Pinterest; hide empty). Then logo/copyright. Resource and social links use `HelpLink`. |
| `ResourcePage` | Shared public view for `/warranty`, `/certifications`, `/technical`: `Home / …` breadcrumb, heading and body from `site_contacts`. |
| `DatasheetLabelManager` | Variant options page: IP / warranty / voltage datasheet squares and extra icons (CE, DALI). Upload or Generate by AI. Artwork is stored on the catalog option. |
| `EntityDatasheetLabelEditor` | Series variants page: pick extra datasheet squares from the Variant catalog as tags (filled = on this series). Create new icons on `/admin/variant-options`. |
| `DescriptionPhraseEditor` | Series variants page: phrase template textarea, `{{spec}}` token chips, guide words, and Generate by AI. |
| `ImageLightbox` | Click-to-enlarge overlay with zoom. Admin thumbs that use `/uploads` skip Next image optimization. |
| `ImageCutboard` | Staff upload crop board. Starts at contain (whole photo visible); zoom and drag, then Apply. Use `useImageCutboard()` plus `IMAGE_FRAMES` from `image-frames.ts`. |
| `SeriesFeaturedImageEditor` | Series admin: one source upload, then 16:9 / 4:5 / 1:1 crops. Each slot can upload or replace its own photo, or adjust the crop from the source. |
| `AdminPhotoSlot` | Square admin photo cell (`aspect-square`). Hover shows a larger preview; click opens `ImageLightbox`. Used by size-pack and appearance photos. `AdminHoverPreview` wraps other admin images for the same hover enlarge. |
| `SizePackPhotos` | Series size rows: square Main A/B and Size drawing upload. Size drawing has **Generate by AI** (crop Main A, then refine and Apply). Hover enlarge via `AdminPhotoSlot`. |
| `AppearancePhotos` | Series Finish × Trim × Reflector photos, directly under Size. Square thumbs, Upload, Generate by AI (pending preview, Confirm to save), Generate missing, Generate all, Confirm all / Discard all, Remove. Unused leftover photos from cleared tags are listed separately. Hidden when those kinds are N/A and no unused photos remain. |
| `WhyChooseIcon` | Homepage Why Choose SVG keyed by `energy` / `lifespan` / `design` |
| `AdminPageHeader` | Admin title, actions, back link, optional logout |
| `SiteNav` | Header links. On `/admin` (not login): Home plus Catalog / Projects / Settings / Users hover menus from `admin-nav.ts`. Public pages keep Products / Projects / Contact Us. |
| `AdminNavSectionBody` | Shared Catalog / Projects / Settings / Users link lists for the dashboard cards and header hover panels |
| `StatTile` | Dashboard number + label; optional `href` + `helpKey` |
| `OptionTag` | Catalog option chip on series variants. Outline = available; filled black = selected. Requires `helpKey`. |
| `SpecificationsEditor` | Series/product key-value specs |
| Size packs | Series variants page (`SizePackPhotos`); `/admin/products` redirects to series |

## helpKey

Every new or changed user-facing button must set `helpKey` and upsert a row in `backend-server/src/seed/ensureDefaults.ts` (`DEFAULT_HELP_TIPS`). Tips load from `/api/help-tips`.

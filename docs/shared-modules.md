# Shared modules

LEVO keeps duplicated logic in one place instead of copying it across the Next.js app and Express API.

## Pure shared folder

`backend-server/src/lib/shared/` is TypeScript with no Node or browser APIs.

| File | Contents |
|------|----------|
| `product-specs.ts` | Spec field lists (Finish / Trim / Reflector labels), `APPEARANCE_NA` / `isAppearanceNa`, `formatSpecValue`, PDF filenames (SKU datasheet / installation / label use the model code; family datasheet uses the series name) |
| `spec-icons.ts` | Catalog table icons: Kelvin → CCT swatch hex, finish name → swatch colours, beam degrees for the cone icon |
| `appearance-photos.ts` | Finish / Trim / Reflector combo rows, N/A checks, lookup of stored appearance photos (`findAppearancePhoto` for the catalog, `findExactAppearancePhoto` / `familyAppearancePhotoRows` for the family datasheet, `unusedAppearancePhotos` for leftover admin rows), AI prompt lines |
| `series-options.ts` | Series variant kinds (including size), catalog kinds without size (`catalogVariantFields`), grouping, unique equivalent values (`120` / `120°`), visitor selector rules, ascending option sort (`compareOptionValues` / `uniqueOptionsForKind`), cartesian combo rows (`cartesianComboRows` / `specFromCombo` / `findSizePack`), visitor / admin kind order (`variantSpecFields` / `VARIANT_KIND_DISPLAY_ORDER`: physical, electrical, optic, control), ordering codes, datasheet SKU segments (`orderCodeSegments` / `composeDatasheetSku` / `skuSegmentText` / `compactSkuCode` / `resolvedSkuSegment` / `skuCodingKinds` / `familyOrderCodeSegments` column grid; single-option kinds omitted except Model), family datasheet helpers (`familyOptionsForKind` / `familyWattageRows` / `familyPolarCombos` / `familyColourGroups`), series page href (`seriesPageHref` / `selectionFromSpec`), variant option catalog types |
| `datasheet-labels.ts` | Datasheet PDF square badges. `datasheetLabelsForSpec` looks up `label_image` on the variant catalog for IP / warranty / voltage (and matching spec kinds) on a SKU. `datasheetLabelsForSeriesOptions` lists those badges for every value a series offers (plus size-pack values when passed). `copyPackDatasheetFields` fills missing IP / warranty / voltage on a combo spec from the size pack. `extraLabelsFromCatalog` / `toggleExtraLabel` let a series pick extra catalog icons (`kind` `datasheet_label`). `mergeScopedDatasheetLabels` then overlays leftover `product_types.datasheet_labels` and `product_series.datasheet_labels`, using catalog artwork when it matches. |
| `description-phrase.ts` | Series phrase template (`{{wattage}}`, `{{source_lumen}}`, `{{system_lumen}}`, `{{cct}}`, …), `fillPhraseTemplate`, `phraseSpecFromOptionDrafts` (size pack + joined series tags for style match), placeholder field list. `{{source_lumen}}` maps to spec `lumen`; `{{lumen}}` still works. |
| `slugify.ts` | `slugify()` |
| `cache-constants.ts` | `PUBLIC_LIST_CACHE` / `PUBLIC_CACHE_CONTROL` |
| `size-drawing-mounting.ts` | Recessed mount / cuthole checks |
| `production-secrets.ts` | Local default names, production fail-fast, `INTERNAL_API_HEADER` |
| `safe-href.ts` | `safeHttpUrl` / `safePublicHref` for stored links |
| `image-magic.ts` | JPEG/PNG/GIF/WebP magic-byte check |
| `admin-roles.ts` | `system` / `admin` / `operation`, page keys, default matrix, path → page mapping, and `roleCanOpenPage` |
| `admin-session-cookie.ts` | HMAC cookie create/verify (`username.role.exp.epoch.sig`), `safeAdminNextPath`, `adminLoginHref`, and `cookieIsSecure` (`Secure` only for HTTPS `SITE_ORIGIN`) |
| `admin-backend-path.ts` | Admin BFF path allowlist; public catalog GET/HEAD vs 405 |

Frontend imports via the `@shared/*` path in `frontend/tsconfig.json`. Backend wrappers (`productSpecs.ts`, `slugify.ts`, `publicCache.ts`) re-export plus backend-only extras (`uniqueSlug`, datasheet field labels).

## Frontend data clients

- `sqlite-api.ts` — server catalog/projects/contact reads; `getFeaturedSeries`; `getDatasheetUrl` / `getInstallationUrl` / `getLdtUrl` / `getSeriesDatasheetUrl` / `getSeriesFamilyDatasheetUrl` / `getSeriesInstallationUrl` / `getSeriesLdtUrl` / `getSeriesPolarUrl` / `getProductLabelUrl` / `getGeneralLabelUrl` for catalog and admin downloads
- `admin-backend.ts` — session-gated BFF proxy to Express (`requireAdminSession` / `requirePageAccess` / `requireAdminRole`), plus `createPublicCatalogProxy` / `createAdminProxy`
- `admin-fetch.ts` — browser `adminFetchJson` / `uploadAdminImage`
- `admin-nav.ts` — Catalog / Projects / Settings / AI / Users sections for the admin header menus and dashboard shortcut cards, filtered by role page access
- `use-admin-me.ts` — shared `/api/admin/me` fetch (username, role, pages) for the header and admin page gate. Distinguishes `unauthorized` (send to login) from `unreachable` (API down).
- `site-contact-display.ts` — omit blank email / phone / address / hours / website on the public footer and Contact Us page. Construction mode is `PublicCatalogGate` in the root layout (public pages only; `/admin` stays open).
- `image-utils.ts` — the only image URL builder (`toPublicImagePath`, `shouldSkipImageOptimize`, `productImageUrl`, `resolveSeriesImageUrl`, `uniqueSeriesPhotoUrls`, plus `seriesFeaturedCatalogUrl` / `seriesFeaturedPageUrl` / `seriesFeaturedDatasheetUrl`)
- `image-frames.ts` — placeholder aspect ratios, `SERIES_FEATURED_SLOTS`, and `validateImageFile` / `assignFileToInput` for the upload crop board
- `image-file-intake.ts` — `IMAGE_INTAKE_HINT`, `isImageFile`, and extractors for drag / clipboard / file-picker photos used by `ImageFileIntake`
- `image-cutboard.ts` — canvas crop of a zoomed/panned image into a framed File (zoom 1 = contain)
- `strapi-entity.ts` — `{ id, attributes }` unwrap + `catalogSeriesHref` / `catalogProductHref`
- `catalog-filters.ts` — wattage / size / CCT / beam / dimming options from series tags (ascending numeric/natural order); category pages filter series, not SKUs; `catalogTypeIsBrowsable` hides public types with `series_count === 0`
- `project-categories.ts` — preferred project category order and `projectFilterCategories()` for public `/projects` pills

Do not add a second catalog client. Admin pages call `/api/admin/backend` through `ADMIN_BACKEND_BASE` in `api-config.ts`.

## Backend helpers

- `database.ts` — SQLite by default; PostgreSQL when `DATABASE_URL` / `DB_DIALECT=postgres` is set
- `dbSchema.ts` — dialect-safe `ensureTable` / `ensureIndex` for startup schema
- `asyncHandler.ts` — Express try/catch + `clientError`
- `strapiSerialize.ts` — media envelope + type envelope + `parseSpecs`
- `productMedia.extractStoredImageUrl` — image values on type/series/product writes
- `photometric/persistProductLdt.ts` — stamp and store a product `.ldt` on create/update (`ldt_file`)
- `photometric/writeProductLdtFile.ts` — write/resolve/delete `/uploads/product-ldt/{series}/{id}.ldt`
- `seriesConfig.ts` — load/replace/merge `series_options`, batch `loadSeriesOptionsForIds` for list pages, resolve a series + query into a spec (options + size-pack photos), upsert size packs (optional `pack_id` keeps photos on that product when the label changes; `main_image_A` / `main_image_B` / `size_image` on a size option write those columns on Save variants), upsert matching rows into `variant_option_catalog`
- `variantCatalog.ts` — load/replace/upsert/backfill global option labels and SKU codes
- `internalAuth.ts` — Express `X-Levo-Internal` check on non-public routes
- `pdfResponse.ts` — shared `sendPdf` for datasheet / series / label downloads
- `ai/aiStyleImage.ts` — size-drawing and catalog photo style files under `/images/ai/`
- `ai/aiImageDataUrl.ts` — parse/compact AI image data URLs (JPEG, max edge 1600) and read a local public product photo from disk
- `ai/aiImageGeneration.ts` — xAI Imagine / Google image generate-or-edit. xAI `/images/edits` uses `image: { url, type }` for one photo and `image: [data URI, …]` for two or more (`assignXaiEditImages`). Catalog style match sets `sourceFirst` so the product is `<IMAGE_0>`; size drawing still sends the style drawing first.
- `ai/productPhotoStylePrompts.ts` — 3-step catalog style-match template (cutout / polish / place-in-scene), look-only lock, `{{hints_line}}`, filled phrase, and original-photo description (`fillProductPhotoStylePrompt`)
- `ai/productPhotoDescribeAi.ts` — chat/vision look at the original product photo before Imagine restyles it
- `ai/aiUsage.ts` — `/admin/ai` usage: xAI billed ticks (÷ 10¹⁰), Google image token estimates, rewrite of old ticks÷1e6 rows
- List `GET /api/product-series` uses a light serializer (one catalog load, batched options, no appearance photos). Detail `by-slug` / `:id` stays full.

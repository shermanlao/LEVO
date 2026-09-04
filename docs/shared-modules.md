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
| `description-phrase.ts` | Series phrase template (`{{wattage}}`, `{{source_lumen}}`, `{{system_lumen}}`, `{{cct}}`, …), `fillPhraseTemplate`, placeholder field list. `{{source_lumen}}` maps to spec `lumen`; `{{lumen}}` still works. |
| `slugify.ts` | `slugify()` |
| `cache-constants.ts` | `PUBLIC_LIST_CACHE` / `PUBLIC_CACHE_CONTROL` |
| `size-drawing-mounting.ts` | Recessed mount / cuthole checks |

Frontend imports via the `@shared/*` path in `frontend/tsconfig.json`. Backend wrappers (`productSpecs.ts`, `slugify.ts`, `publicCache.ts`) re-export plus backend-only extras (`uniqueSlug`, datasheet field labels).

## Frontend data clients

- `sqlite-api.ts` — server catalog/projects/contact reads; `getFeaturedSeries`; `getDatasheetUrl` / `getInstallationUrl` / `getLdtUrl` / `getSeriesDatasheetUrl` / `getSeriesFamilyDatasheetUrl` / `getSeriesInstallationUrl` / `getSeriesLdtUrl` / `getSeriesPolarUrl` / `getProductLabelUrl` / `getGeneralLabelUrl` for catalog and admin downloads
- `admin-backend.ts` — session-gated BFF proxy to Express (`requireAdminSession` / `requireAdminRole`), plus `createPublicCatalogProxy` / `createAdminProxy`
- `admin-fetch.ts` — browser `adminFetchJson` / `uploadAdminImage`
- `admin-nav.ts` — Catalog / Projects / Settings / Users sections for the admin header menus and dashboard shortcut cards
- `image-utils.ts` — the only image URL builder (`toPublicImagePath`, `shouldSkipImageOptimize`, `productImageUrl`, `resolveSeriesImageUrl`, `uniqueSeriesPhotoUrls`, plus `seriesFeaturedCatalogUrl` / `seriesFeaturedPageUrl` / `seriesFeaturedDatasheetUrl`)
- `image-frames.ts` — placeholder aspect ratios, `SERIES_FEATURED_SLOTS`, and `validateImageFile` / `assignFileToInput` for the upload crop board
- `image-cutboard.ts` — canvas crop of a zoomed/panned image into a framed File (zoom 1 = contain)
- `strapi-entity.ts` — `{ id, attributes }` unwrap + `catalogSeriesHref` / `catalogProductHref`
- `catalog-filters.ts` — wattage / size / CCT / beam / dimming options from series tags (ascending numeric/natural order); category pages filter series, not SKUs

Do not add a second catalog client. Admin pages call `/api/admin/backend` through `ADMIN_BACKEND_BASE` in `api-config.ts`.

## Backend helpers

- `database.ts` — SQLite by default; PostgreSQL when `DATABASE_URL` / `DB_DIALECT=postgres` is set
- `dbSchema.ts` — dialect-safe `ensureTable` / `ensureIndex` for startup schema
- `asyncHandler.ts` — Express try/catch + `clientError`
- `strapiSerialize.ts` — media envelope + type envelope + `parseSpecs`
- `productMedia.extractStoredImageUrl` — image values on type/series/product writes
- `photometric/persistProductLdt.ts` — stamp and store a product `.ldt` on create/update (`ldt_file`)
- `photometric/writeProductLdtFile.ts` — write/resolve/delete `/uploads/product-ldt/{series}/{id}.ldt`
- `seriesConfig.ts` — load/replace/merge `series_options`, resolve a series + query into a spec (options + size-pack photos), upsert size packs, upsert matching rows into `variant_option_catalog`
- `variantCatalog.ts` — load/replace/upsert/backfill global option labels and SKU codes

# Variant options

Global spec option lists with SKU **codes** and datasheet **label artwork**, edited at `/admin/variant-options`. Series pages add those options as **tags** and reuse the matching badge.

## Why

Datasheet model codes need a short segment per variant (for example CCT option `3000K` → code `30K`). Those mappings are stored once, then reused:

- `/admin/product-series/[id]` — click catalog tags to attach or remove options for that series
- SKU datasheet PDF — the unique hyphen-joined SKU under `{series}, {product_code}` (`DL00001-OD-15W-30K-24D-010`: physical, electrical, optic, then control). Kinds with only one real option (Trim, CRI) are omitted. Display labels that start with `>` (for example CRI `>90`) are compacted to `90` so the join does not read as an arrow.
- Family datasheet PDF — SKU coding is a content-width column grid (header, grey code bar, hyphen between cells, `code - label` lists) built from Model plus catalog codes that have two or more choices. See [product-datasheet.md](product-datasheet.md).

IP / warranty / voltage datasheet squares use `label_image` on the matching catalog row when that option is on the product (SKU sheet) or offered by the series (family sheet). Extra icons (CE, DALI) are **created on Variant** (`kind` `datasheet_label`) and **picked on each series**. Product Types do not add labels. See [product-datasheet.md](product-datasheet.md) and [product-codes.md](product-codes.md).

## Data

Table `variant_option_catalog`: `kind`, `value`, `code`, `sort_order`, `label_image`. Unique on `(kind, value)`.

`kind` is a spec key from [`catalogVariantFields()`](../backend-server/src/lib/shared/series-options.ts) (CCT, trim, beam, CRI, control, lamp source, wattage, …). **Size** is not in this catalog; each series edits its own size list on `/admin/product-series/[id]`. Extra datasheet icons use catalog rows with `kind` `datasheet_label`; a series stores which of those extras it uses in `product_series.datasheet_labels`.

`series_options` still stores which values a series offers. Codes and label images live only in this catalog. Series API copies `code` and `label_image` onto each option for the catalog page.

On API boot, empty catalog rows are backfilled from existing products and series options (labels only; staff fill codes). Existing `product_series.datasheet_labels` JSON is migrated onto matching catalog rows. Creating or updating a product, or saving series variants, upserts new values without overwriting a code that is already set unless the series save sends a non-empty code. Saving the Variant page keeps existing `label_image` values when the PUT body omits them. Merging duplicate option rows keeps whichever artwork is already set.

## Admin

- `/admin` Catalog card → **Variant**
- `/admin/variant-options` — compact two-column option cards in physical → electrical → optic → control order (Size omitted); Option + Code rows; Add / Remove / Save. IP / warranty / voltage datasheet artwork (upload / Generate by AI / clear) and extra icons (CE, DALI) stay here.
- `/admin/product-series/[id]` — catalog options as tags in that same kind order (filled = on this series; outline = click to add). Finish / Trim / Reflector also have **N/A**. Size stays as per-series label / dimensions / cutout rows. Extra datasheet squares are picked from Variant tags (not created on the series).

`GET` / `PUT /api/variant-options` (session via `/api/admin/backend/variant-options`). PUT body `{ options: [{ kind, value, code, sort_order, label_image }] }` replaces the catalog (extra kinds such as `datasheet_label` are kept). `PUT` / `DELETE /api/variant-options/label` upserts or clears a single option’s artwork (`{ kind, value, label_image }`).

Shared helpers: `orderCodeSegments`, `familyOrderCodeSegments`, `skuCodingKinds`, `composeDatasheetSku`, `lookupCatalogCode`, `lookupCatalogLabel`, `datasheetLabelsForSpec`, `datasheetLabelsForSeriesOptions`, `copyPackDatasheetFields`, `extraLabelsFromCatalog`, `toggleExtraLabel`, `mergeScopedDatasheetLabels` in [`series-options.ts`](../backend-server/src/lib/shared/series-options.ts) and [`datasheet-labels.ts`](../backend-server/src/lib/shared/datasheet-labels.ts). Backend load/replace: [`variantCatalog.ts`](../backend-server/src/lib/variantCatalog.ts).

## Help tips

`admin.dash.link.variant_options`, `admin.variant_options.save`, `admin.variant_options.option_add`, `admin.variant_options.option_remove`, `admin.variant_options.back`, `admin.variant_options.datasheet_labels`, `admin.variant_options.label_upload`, `admin.variant_options.label_ai`, `admin.variant_options.label_clear`, `admin.variant_options.label_add`, `admin.variant_options.label_remove`, `admin.product_series.datasheet_labels`, `admin.product_series.label_upload`, `admin.product_series.label_ai`, `admin.product_series.label_clear`, `admin.product_series.label_add`, `admin.product_series.label_remove`, `admin.product_series.option_pick`, `admin.product_series.option_remove`.

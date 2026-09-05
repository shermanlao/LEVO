# Series variant configurator

The public catalog unit is a **series**. Staff pick variant tags and sizes on the series. Visitors see the cartesian product of every kind that has two or more **real** values (N/A Finish / Trim / Reflector do not count). Product rows are **size packs** only: size identity plus photos for that size. Finish / Trim / Reflector product photos live on `series_appearance_photos` and swap the gallery when selected. See [appearance-photos.md](appearance-photos.md).

## Public series page

`/products/[type]/[series]` (for example `/products/downlights/eco-pro`) shows the gallery (main photo locked to **4:5** from `featured_image_page`, falling back to the source then the 16:9 catalog crop). A matching appearance photo replaces that hero only after the visitor picks options. Option-list thumbs and the compact SKU dialog use the 1:1 `featured_image_datasheet` crop when a product photo is missing. The table is viewport-width (`table-fixed`): SKU and size wrap in narrow columns so remaining variant columns fit without a wide horizontal scroll. Physical columns sit left of electrical, optic, then control (size, finish, trim, reflector, IP, then wattage, CCT, beam, dimming). The printed SKU uses that same segment order (`composeDatasheetSku`) and omits kinds with only one real option. Size shows dimensions and cut-out on two lines. CCT, beam, and finish cells use swatch / beam-cone icons from `SpecValueIcons` (colours come from the option value, not a separate stored field). Dropdowns appear only when a spec has **two or more** values, in physical → electrical → optic → control order (same as the table, SKU, `/admin/variant-options`, and `/admin/product-series/[id]`). A kind with a single stored value is applied to every row and is not shown as a dropdown. Core table columns (wattage, size, CCT, beam, dimming, finish) still list that value; extra selectors such as reflector and IP appear as columns when they have two or more values. Query params (`?wattage=10&size=Ø90mm&cct=3000K&…`) keep the selection shareable. The table filters to combinations that match filled selectors. `preview=1` (used on datasheet QR codes) opens the SKU preview dialog when exactly one combination matches.

Old SKU URLs `/products/[type]/[series]/[slug]` redirect to the series page (`?size=` when the size pack has dimensions). Search, homepage featured, and category cards open the series, not a SKU page.

When every visible selector has a value, **Datasheet** and **LDT** generate files for that combination. Each table row uses the same series file URLs with that row’s query string. The series title row has **Family Datasheet** (`GET /api/series/:slug/family-datasheet`) and **Installation** (`GET /api/series/:slug/installation`), independent of page filters. Family datasheet: featured photo, key-fact chips, Physical / Technical ranges from `series_options`, SKU coding column grid, size drawings with a photo-width Power/source/system table, Finish / Trim / Reflector chips packed on one row when their measured widths fit, appearance photos kept with their heading, and stamped polars for each power × beam pair (source lumen → cd, one ring scale per beam; not cartesian SKU rows, not an Installation block). See [product-datasheet.md](product-datasheet.md). Installation is one PDF for the whole series (mounting, unique sizes/cut-outs, IP, wiring). LDT and the datasheet polar image follow the selected beam (and stamp lumen / wattage / CCT / size from the combination). Clicking a row SKU or thumbnail opens a preview dialog (`ProductSkuDialog`) with series files, the same left-column images as the datasheet (photo, size drawing, polar from `/api/series/:slug/polar`), compact IP / warranty / voltage badges plus extra icons picked on the series, the filled **phrase template** under those badges, Series + SKU on the right, and specs built from the combination.

## Data

Table `series_options`: `series_id`, `kind`, `value`, `sort_order`, plus extras:

- **size** — `dimensions`, `cutout_size` (cut-out packaged with that size). Each size upserts one product size pack (photos: main A/B, size drawing).
- **wattage** — source lumen (`lumen`) and `system_lumen` (not visitor dropdowns; source lumen required for LDT)

Visitor dropdowns and combo rows are sorted **ascending** by numeric/natural value (`compareOptionValues` in [`series-options.ts`](../backend-server/src/lib/shared/series-options.ts)), not by insertion `sort_order`. Wattage lists as 10W, 12W, 15W; CCT, beam, IP, and size use the same rule. `sort_order` is only a tiebreaker.

`kind` is any physical/technical spec key from [`product-specs.ts`](../backend-server/src/lib/shared/product-specs.ts), plus `size`. Source lumen, system lumens, and efficacy are not visitor kinds. Dimensions and cut-out are not separate kinds.

`product_series.product_code` is the family model code (`DL00001`). `product_series.is_featured` controls the homepage. `product_series.ldt_family` (`circular` / `linear`) is used for custom LDT. `product_series.description` is short marketing copy (cards and the series title). `product_series.description_phrase` is the datasheet / SKU-dialog sentence with `{{wattage}}`, `{{cct}}`, `{{beam_angle}}`, `{{source_lumen}}`, `{{system_lumen}}` (and other spec keys) blanks; `fillPhraseTemplate` in [`description-phrase.ts`](../backend-server/src/lib/shared/description-phrase.ts) fills them from the selected combination. `{{source_lumen}}` reads the wattage row’s `lumen` value; legacy `{{lumen}}` still fills the same field. Missing-spec semicolon clauses are dropped. An empty phrase is not shown in the dialog; the datasheet then falls back to the marketing description, then to the auto-generated LED intro.

Shared helpers: [`series-options.ts`](../backend-server/src/lib/shared/series-options.ts) (`cartesianComboRows`, `specFromCombo`, `findSizePack`). Resolver: [`seriesConfig.ts`](../backend-server/src/lib/seriesConfig.ts) — series options + size-pack photos only (no SKU spec overlay, no size-pack polar); sets `spec.description` to the filled phrase when one exists. Polar / LDT use `product_series.ldt_family` plus the selected `beam_angle`.

## Custom files

| File | URL |
|------|-----|
| Family datasheet | `GET /api/series/:slug/family-datasheet` (no query; whole series) |
| Datasheet | `GET /api/series/:slug/datasheet?wattage=&size=&cct=&beam_angle=&dimming=` |
| Installation | `GET /api/series/:slug/installation` (no query; whole series) |
| LDT | `GET /api/series/:slug/ldt?...` |
| Polar PNG | `GET /api/series/:slug/polar?...` (SKU dialog photometric; same drawing as the datasheet) |

Unknown option values return **400**. Missing visible selectors return **400** on datasheet and LDT. LDT returns **400** when the selected wattage has no source lumen. The LDT catalog number and download name are the printed SKU. Installation ignores query params.

The datasheet model code is the series `product_code`. The printed SKU is `composeDatasheetSku` (model + catalog codes in physical → electrical → optic → control order: Finish, Trim, Reflector, Wattage, CCT, Beam, CRI, Control). A kind with only one real option is omitted from both the printed SKU and the family **SKU coding** grid (Model always stays). Product photo comes from the matching appearance photo when one exists, otherwise the size pack. Size drawing comes from the size pack. The polar plot is generated from the selected beam, scaled by the selected wattage’s source lumen into candela. It is not a stored size-pack image.

## Admin

- `/admin/products` — redirects to `/admin/product-series`
- `/admin/product-series` — list; click a row (or **Variants**) to open `/admin/product-series/[id]`; **Edit** / **Delete** stay on the list
- `/admin/product-series/[id]` — option tags (Finish / Trim / Reflector include **N/A**), size rows with photos (Main A/B plus **Generate by AI** on Size drawing), **appearance photos** (generate from Main A, Confirm to save), **phrase template**, model code, featured flag, **datasheet labels** (picked from Variant extras), LDT shape, and **Import from partner** (type and series locked)
- `/admin/product-types` — category name, slug, description, and featured image (no datasheet labels on this page)
- `/admin/variant-options` — global option labels, SKU codes, IP / warranty / voltage datasheet badge artwork, and extra icons (CE, DALI). See [variant-options.md](variant-options.md).

## Help tips

`catalog.series.filter_toggle`, `catalog.series.wattage`, `catalog.series.size`, `catalog.series.cct`, `catalog.series.beam`, `catalog.series.dimming`, `catalog.series.colour`, `catalog.series.trim_color`, `catalog.series.reflector_finish`, `catalog.series.clear`, `catalog.series.sku_preview`, `catalog.series.sku_close`, `catalog.family_datasheet.download`, `catalog.installation.download`, `catalog.series.{kind}` for extra spec selectors, `admin.product_series.variants`, `admin.product_series.option_add`, `admin.product_series.option_remove`, `admin.product_series.option_pick`, `admin.product_series.save_variants`, `admin.product_series.ldt_family`, `admin.product_series.back_list`, `admin.product_series.featured`, `admin.product_series.size_photo_a`, `admin.product_series.size_photo_b`, `admin.product_series.size_drawing`, `admin.product_series.size_drawing_ai`, `admin.product_series.size_drawing_ai_focus`, `admin.product_series.size_drawing_ai_cancel`, `admin.product_series.size_drawing_ai_refine`, `admin.product_series.size_drawing_ai_apply`, `admin.product_series.appearance_photos`, `admin.product_series.appearance_generate`, `admin.product_series.appearance_generate_missing`, `admin.product_series.appearance_generate_all`, `admin.product_series.appearance_upload`, `admin.product_series.appearance_remove`, `admin.product_series.appearance_cancel`, `admin.product_series.appearance_na`, `admin.product_series.description_phrase`, `admin.product_series.phrase_token`, `admin.product_series.phrase_ai`, `admin.product_series.datasheet_labels`, `admin.product_series.label_upload`, `admin.product_series.label_ai`, `admin.product_series.label_clear`, `admin.product_series.label_add`, `admin.product_series.label_remove`. IP / warranty / voltage artwork tips live under `admin.variant_options.*` (see [variant-options.md](variant-options.md)).

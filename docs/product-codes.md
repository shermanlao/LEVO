# Product codes

Storefront model codes are LEVO-owned and live on the **series** (`product_series.product_code`). Partner articles never appear as `product_code` on the catalog.

## Format

`{TYPE}{NNNNN}` — two letters, five digits, no `LEVO` prefix, no hyphen.

Examples: `DL00001`, `DL00007`, `TR00012`.

| Product type slug | Prefix |
|-------------------|--------|
| `downlights` | `DL` |
| `linear-lighting` | `LN` |
| `track-lighting` | `TR` |
| `spotlights` | `SP` |
| other | first two letters of the slug (fallback `GP`) |

Generator: [`backend-server/src/lib/productCode.ts`](../backend-server/src/lib/productCode.ts). Sequence table `product_code_sequences` (`prefix`, `last_n`). New series (blank code) take the next free value. Existing series without a code are backfilled from the first child product code, or allocated. Partner import does **not** allocate a new model code per article.

## Vendor fields

| Column | Meaning | Public page |
|--------|---------|-------------|
| `product_series.product_code` | LEVO model (`DL00007`) | Yes (datasheet + printed SKU) |
| `vendor_code` | Partner article / `vendorProductCode` | Admin only, stored on the size pack |
| `vendor_model` | Partner model (e.g. `LX-AD10104`) | Admin only, stored on the size pack |

The public series table lists generated combinations, not stored SKUs. See [series-configurator.md](series-configurator.md).

## Datasheet SKU

The printed SKU under `{series}, {product_code}` on a product datasheet is the hyphen-joined model code: Model (`product_code`) plus catalog **codes** in the same order as the series table — physical (finish, trim, reflector), electrical (wattage), optic (CCT, beam, CRI), then control. A kind is included only when the series has **two or more** real option codes; a single choice (Trim `WH`, CRI `90`) is omitted because it does not distinguish SKUs. Example: `DL00001-OD-15W-30K-24D-010` when Trim and CRI are fixed. Empty or **N/A** Finish / Trim / Reflector segments are omitted. If a catalog `code` is blank, a compact fallback is used (`15` → `15W`, `White` → `WH`, `Opal Diffuser` → `OD`, `2700K` → `27K`, `24°` → `24D`, `0-10V` → `010`, `Non-dimmable` → `ND`). Labels such as CRI `>90` are stored as SKU segment `90` so a hyphen does not look like an arrow (`60->90`). The family datasheet draws those same segments as a **SKU coding** column grid (header, grey bar, `code - label` lists, plus one example SKU) instead of printing one SKU. Option labels and codes are edited at `/admin/variant-options`. See [variant-options.md](variant-options.md) and [product-datasheet.md](product-datasheet.md).

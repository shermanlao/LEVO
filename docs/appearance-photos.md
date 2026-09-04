# Appearance photos

Staff pre-generate **Finish**, **Trim**, and **Reflector** product photos on `/admin/product-series/[id]`. Visitors and datasheets only read stored files — AI never runs at download time.

Size pack photos stay on the size row (Main A/B and size drawing). Appearance photos are a separate series table.

## Labels

Database keys stay `colour`, `trim_color`, and `reflector_finish`. Display names are **Finish**, **Trim**, and **Reflector** (`variantKindLabel` via [`product-specs.ts`](../backend-server/src/lib/shared/product-specs.ts)).

SKU coding has three segments (no Trim→Finish fallback): Finish, Trim, Reflector. A segment is omitted when that kind is empty or **N/A**.

## N/A

Finish, Trim, and Reflector each have an **N/A** chip on the series page (not a `/admin/variant-options` catalog row).

- Exclusive with real values
- Stored as series option value `N/A`
- Hidden from visitor dropdowns, datasheet spec rows, and SKU codes
- Skipped from the appearance photo cartesian
- LED strip: set all three to N/A — no appearance grid; public photo is size Main A

Empty tags still mean “not configured yet.”

## Staff generate

1. Tag Finish / Trim / Reflector (or N/A), save if needed
2. Upload size Main A
3. Missing combinations generate sequentially from that photo as **pending previews** (the page does not reload). Nothing is written to the database until staff Confirm
4. Staff review: Confirm / Discard the preview, Upload, Generate by AI, or Remove. Hover a photo to enlarge; click for the lightbox
5. **Generate missing** fills empty cells later without overwriting existing photos. Confirm each preview or **Confirm all**
6. **Generate all** generates every combination in one pass as pending previews. It regenerates AI photos and skips staff uploads. Confirm to save
7. Photos left over from tags you later cleared (for example Finish White after switching Finish to N/A) appear under **Unused photos**. They are hidden from the family datasheet until you Remove them or restore those tags

The Appearance photos card sits directly under Size. Placeholders are square, matching product photos. Staff uploads open the shared crop board at that 1:1 frame.

Fewer than two appearance combinations skips AI (the size Main A is enough).

## Data

Table `series_appearance_photos`: `series_id`, `colour`, `trim_color`, `reflector_finish` (empty string when unused), `main_image_A`, `source_product_id`, `generated_by_ai`. Unique on the combo.

Helpers: [`appearance-photos.ts`](../backend-server/src/lib/shared/appearance-photos.ts) (`appearanceComboRows`, `findAppearancePhoto`, `findExactAppearancePhoto`, `familyAppearancePhotoRows`, `unusedAppearancePhotos`, prompt lines). The family datasheet prints only current combo rows (`familyAppearancePhotoRows`), not leftover unused photos.

## APIs (admin session)

- `POST /api/admin/ai/generate-appearance-photo` `{ imageDataUrl, colour?, trim_color?, reflector_finish? }`
- `GET` / `PUT` / `DELETE /api/product-series/:id/appearance-photos`

Public series JSON includes `attributes.appearance_photos`. `resolveSeriesConfig` overlays `main_image_A` from the matching appearance photo after the size pack.

## Help tips

`admin.product_series.appearance_photos`, `appearance_generate`, `appearance_generate_missing`, `appearance_generate_all`, `appearance_confirm`, `appearance_discard`, `appearance_confirm_all`, `appearance_discard_all`, `appearance_upload`, `appearance_remove`, `appearance_cancel`, `appearance_unused`, `appearance_unused_remove`, `admin.product_series.appearance_na`, `catalog.series.colour`, `catalog.series.trim_color`, `catalog.series.reflector_finish`.

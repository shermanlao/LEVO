# Appearance photos

Staff upload a **tagged photo library** on `/admin/product-series/[id]`. Visitors, SKU datasheets, and the family datasheet only read stored files — AI never runs at download time.

Product photos live in this library. The size row keeps **Size drawing** only. On API start, any leftover size-pack Main A / Main B files are copied into the library tagged with that size, then those product columns are cleared.

There is no required Finish × Trim × Reflector grid.

## Tags

Each photo can carry **Finish**, **Trim**, **Reflector**, and **Size**. One value per tag; click again to clear. An empty tag means “any”. Size uses the series Size option value (the same label as the product table Size column).

Database keys stay `colour`, `trim_color`, `reflector_finish`, and `size`. Display names are **Finish**, **Trim**, **Reflector**, and **Size** (`variantKindLabel` via [`product-specs.ts`](../backend-server/src/lib/shared/product-specs.ts) / [`series-options.ts`](../backend-server/src/lib/shared/series-options.ts)).

SKU coding has three appearance segments (no Trim→Finish fallback): Finish, Trim, Reflector. A segment is omitted when that kind is empty or **N/A**.

## Matching

A photo is compatible with a variant only when **every tag that is set** equals that variant. A disagreeing tag drops the photo, so a White + size photo never shows on another size or another finish.

Compatible photos are ordered **most match → least match**: more tags first, then newer `id`. The product photo uses that chain:

1. Most match
2. 2nd most match
3. … continuing down …
4. Least match (fewest tags, including a photo with no tags)
5. Series featured photo (`featured_image_page`, then an older datasheet crop, then the old source) only when the chain is empty

The table thumbnail and the SKU datasheet hero use the first photo. The series hero carousel lists the chain, best first. If a stored path is empty, the next photo in the chain is used.

Example: Photo A tagged White, Photo B tagged White and `L172.5 x W92 x H76mm`. That size shows B then A. Any other white size shows A only. Black shows neither; the series photo fills the slot.

## N/A

Finish, Trim, and Reflector each have an **N/A** chip on the series page (not a `/admin/variant-options` catalog row).

- Exclusive with real values
- Stored as series option value `N/A`
- Hidden from visitor dropdowns, datasheet spec rows, and SKU codes
- LED strip: set all three to N/A — public photo still uses tagged library photos, then the series photo

Empty tags on a photo still mean “any”.

## Staff upload

1. **Add photo** as many times as needed (drop, paste, or choose a file). Uploads open the shared crop board at the 1:1 catalog frame
2. Tag Finish / Trim / Reflector / Size on that photo. Tags save immediately
3. Click a filled photo to open **Edit photo with AI** (same chat as the series photo on `/admin/product-series/[id]/edit`). Describe the change and Send, or Upscale. Apply saves that photo immediately
4. Optional: **Generate by AI** edits the photo on that card (or another library photo if this slot is empty, then the series photo). Finish / Trim / Reflector tags are sent when set; size is not. The preview stays pending until Confirm
5. Optional: **Match catalog style** on a filled photo (needs a catalog style photo on `/admin/ai`)
6. Replace or Remove a single photo

Duplicating a size copies appearance photos that have the old size tag onto new rows tagged with the copy label.

Photos whose tags are no longer on the series stay in the library (status **Unused tags**) and are omitted from the family datasheet until you clear those tags or restore the series options.

The Appearance photos card sits directly under Size. Placeholders are square, matching product photos.

## Data

Table `series_appearance_photos`: `series_id`, `colour`, `trim_color`, `reflector_finish`, `size` (empty string when unused), `main_image_A`, `source_product_id`, `generated_by_ai`. Several photos may share the same tags. Size-pack `main_image_A` / `main_image_B` columns remain on `products` but are not written from the size UI.

Helpers: [`appearance-photos.ts`](../backend-server/src/lib/shared/appearance-photos.ts) (`rankAppearancePhotos` / `findAppearancePhoto` for the catalog and SKU datasheet, `sizeDrawingProductPhotoPath` / `appearanceAiSourcePath` for admin AI, `familyAppearancePhotoRows` / `unusedAppearancePhotos` / `photoTagsOnSeries` for the family sheet, prompt lines). The family datasheet prints every current tagged photo (`familyAppearancePhotoRows`), captioned with its tags, not leftover unused photos.

On API start, `migrateSizePackMainPhotosToAppearance` in [`seriesConfig.ts`](../backend-server/src/lib/seriesConfig.ts) copies leftover pack Main A/B into this table (tagged by size, skip duplicate paths) and clears those product columns. Partner import still stages photos onto the pack, then runs the same migrate.

## APIs (admin session)

- `POST /api/admin/ai/generate-appearance-photo` `{ imageDataUrl, colour?, trim_color?, reflector_finish? }`
- `GET` / `PUT` / `DELETE /api/product-series/:id/appearance-photos` — PUT and DELETE key by photo `id` (PUT without `id` creates a new row)

Public series JSON includes `attributes.appearance_photos` (each item includes `size`). `resolveSeriesConfig` sets `main_image_A` from the first photo in `rankAppearancePhotos`, else the series featured photo.

## Help tips

`admin.product_series.appearance_photos`, `appearance_add`, `appearance_tag`, `appearance_generate`, `appearance_confirm`, `appearance_discard`, `appearance_confirm_all`, `appearance_discard_all`, `appearance_upload`, `appearance_remove`, `admin.product_series.appearance_na`, `admin.product_series.photo_enhance`, `admin.product_series.photo_style_match`, `catalog.series.colour`, `catalog.series.trim_color`, `catalog.series.reflector_finish`.

# Image crop board

Staff image uploads open a shared **cutboard** so the saved file matches the public placeholder. The board starts at **contain** (the whole photo is visible). Zoom in and drag until the fixture fills the frame, then **Apply crop**. Empty bars in the frame mean it is not filled yet.

The component is `ImageCutboard` plus `useImageCutboard()` in [`frontend/src/components/ui/ImageCutboard.tsx`](../frontend/src/components/ui/ImageCutboard.tsx). Frame sizes live in [`frontend/src/lib/image-frames.ts`](../frontend/src/lib/image-frames.ts). Canvas crop math is in [`frontend/src/lib/image-cutboard.ts`](../frontend/src/lib/image-cutboard.ts). Zoom 1 is contain; Apply still writes the framed pixels (white fill on JPEG empty bars).

## Frames

| Key | Ratio | Used for |
|-----|-------|----------|
| `catalog` | 16:9 | Category featured images, and the series **catalog card** crop |
| `seriesPage` | 4:5 | Series **page gallery** crop |
| `product` | 1:1 | Size-pack Main A/B, size drawing, appearance photos, and the series **datasheet** crop |
| `project` | 16:9 | Project listing thumbnail |
| `projectSection` | 3:2 | Project gallery / section photos |
| `hero` | 3:2 | Homepage hero |
| `og` | 1.91:1 | Open Graph share image |
| `logo` | 3:1 | Header and PDF wordmarks |
| `icon` | 1:1 | Tab icon |
| `label` | 1:1 | Datasheet label squares |

## Series featured image (one source, three crops)

Series featured images are **not** a single-frame upload. [`SeriesFeaturedImageEditor`](../frontend/src/components/admin/SeriesFeaturedImageEditor.tsx) on `/admin/product-series`:

1. Upload a **source** photo (no crop). Stored as `featured_image_source`.
2. A 3-step cutboard crops that source: Catalog 16:9 (`featured_image`) → Series page 4:5 (`featured_image_page`) → Family datasheet 1:1 (`featured_image_datasheet`).
3. Each slot can **Upload photo** / **Replace photo** (pick a different file for that frame only), **Adjust crop** (reopen that frame on the shared source), or **Use a different image** on the cutboard. The shared source is not replaced when a slot uses its own photo. On an existing series, each crop is saved as soon as you Apply (refresh keeps the previews). New series still save the three paths when you click Create Series.

Public fallbacks when a chunk is empty: that surface uses source, then `featured_image`. Existing series keep working until staff re-crop.

| Surface | Field | Frame |
|---------|-------|-------|
| `/products/[type]` cards | `featured_image` | 16:9 |
| `/products/[type]/[series]` gallery | `featured_image_page` | 4:5 `object-cover` |
| Family datasheet hero, option-list thumbs, compact SKU dialog | `featured_image_datasheet` | 1:1 |

## Other upload locations

Every other staff image picker uses `requestCrop(file, frame)` before it uploads: type featured images, size-pack and appearance photos, site assets, size-drawing style, datasheet labels, and project photos.

The size-drawing AI **Focus the fixture** dialog stays a free-form box for the AI prompt. It is not this cutboard.

## Help tips

`admin.image_cutboard.apply`, `admin.image_cutboard.cancel`, series source / three slots / replace / use-a-different-image (`admin.product_series.featured_*`), plus the existing upload tips that mention the matching frame.

# Image crop board

Staff image uploads open a shared **cutboard** so the saved file matches the public placeholder. The board starts at **contain** (the whole photo is visible). Zoom in and drag until the fixture fills the frame, then **Apply crop**. Empty bars in the frame mean it is not filled yet.

Every admin image placeholder accepts a photo three ways before the cutboard opens:

1. **Drop** a photo onto the placeholder
2. **Paste** from the clipboard while the placeholder is hovered or focused (`Ctrl+V` / `Cmd+V`)
3. **Choose a file** from this device (click an empty placeholder)

Shared intake lives in [`frontend/src/lib/image-file-intake.ts`](../frontend/src/lib/image-file-intake.ts) and [`ImageFileIntake`](../frontend/src/components/ui/ImageFileIntake.tsx).

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

1. Upload a **style photo** (no crop). Stored as `featured_image_source`. Drop, paste, or click the empty **Style photo** placeholder on **Add New Series** / **Edit**. **Style with AI** opens the catalog-style chat. **Save style photo** writes the preview back to this placeholder. **Apply to Catalog card**, **Apply to Series page**, and **Apply to Family datasheet** extend the background to that frame and save the location. The same **Apply styled photo** button sits on each location card.
2. **Adjust crop** still opens the cutboard for one frame: Catalog 16:9 (`featured_image`), Series page 4:5 (`featured_image_page`), Family datasheet 1:1 (`featured_image_datasheet`). Uploading a style photo does not start that three-step crop.
3. Each empty location slot is the same drop / paste / choose placeholder as size Main A/B. **Replace photo** appears after a file is saved. **Delete** clears that field; on an existing series the clear is saved immediately. **Use a different image** on the cutboard crops a different file for the current slot only.

**Apply** uses `POST /api/admin/ai/edit-product-photo` with `outpaint` after the browser letterboxes the fixture into the target ratio. The luminaire is not stretched. A photo narrower than the frame grows on the left and right (catalog 16:9 from a square style photo). A photo wider than the frame grows above and below (series page 4:5 from a square style photo). A photo that already matches is copied. Size Main A and Main B on `/admin/product-series/[id]` use the same saved style photo at 1:1. On an existing series, each apply is saved immediately. New series still save the paths when you click Create Series.

Public fallbacks when a chunk is empty: that surface uses source, then `featured_image`. Existing series keep working until staff re-crop.

| Surface | Field | Frame |
|---------|-------|-------|
| `/products/[type]` cards | `featured_image` | 16:9 |
| `/products/[type]/[series]` gallery | `featured_image_page` | Admin crops 4:5; public gallery shows the file’s intrinsic ratio |
| Family datasheet hero, option-list thumbs, compact SKU dialog | `featured_image_datasheet` | 1:1 |

## Other upload locations

Every other staff image picker uses `requestCrop(file, frame)` before it uploads: type featured images, size-pack and appearance photos, site assets, size-drawing style, catalog photo style, datasheet labels, and project photos.

The size-drawing AI **Focus the fixture** dialog stays a free-form box for the AI prompt. It is not this cutboard.

## Help tips

`admin.image_cutboard.apply`, `admin.image_cutboard.cancel`, series style photo / three slots / replace / delete / use-a-different-image (`admin.product_series.featured_*`), `admin.product_series.photo_style_open`, `admin.product_series.photo_apply_location`, plus the existing upload tips that mention the matching frame.

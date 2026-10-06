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
| `catalog` | 16:9 | Category featured **card** photos, and the series **card photo** made with Extend to 16:9 |
| `seriesPage` | photo’s own ratio | Series photo on the series page and datasheets. Adjust crop uses that file’s shape |
| `product` | 1:1 | Size-pack Main A/B, size drawing, and appearance photos |
| `project` | 16:9 | Project listing thumbnail |
| `projectSection` | 3:2 | Project gallery / section photos |
| `hero` | 3:2 | Homepage hero |
| `og` | 1.91:1 | Open Graph share image |
| `logo` | 3:1 | Header and PDF wordmarks |
| `icon` | 1:1 | Tab icon |
| `label` | 1:1 | Datasheet label squares |

## Series and type photos (two slots)

[`FeaturedCardImageEditor`](../frontend/src/components/admin/FeaturedCardImageEditor.tsx) is the shared two-placeholder editor. Series wraps it as [`SeriesFeaturedImageEditor`](../frontend/src/components/admin/SeriesFeaturedImageEditor.tsx) on **Add New Series** (`/admin/product-series`) and **Edit** (`/admin/product-series/[id]/edit`). Product types wrap it as [`TypeFeaturedImageEditor`](../frontend/src/components/admin/TypeFeaturedImageEditor.tsx) on **Add New Type** (`/admin/product-types`) and **Edit** (`/admin/product-types/[id]/edit`).

1. **Source photo** — series: `featured_image_page`; type: `featured_image_source`. Drop, paste, or choose a file. The upload is saved as-is. The preview box uses that file’s own ratio, so a wide admin column does not add empty side bars. Click the photo to open **Edit photo with AI** (chat, Upscale, Apply) instead of enlarging it. **Adjust crop** opens the photo with four edges. Drag one edge at a time to cut that side; the other three stay put. Apply saves the resulting shape. The series source is the series-page gallery and the datasheet hero / thumbs. The type source is only the original used to build the category card.
2. **Card photo** (`featured_image`). The source and card placeholders are the same height. Click the photo to open the same AI edit dialog. **Extend to 16:9** keeps that height and outpaints only the left and right background (`POST /api/admin/ai/edit-product-photo` with `outpaint`). The original source photo is pasted back afterward, so the top and bottom stay exactly as they were and the fixture is not stretched. The side strips and the original ceiling are painted the shared catalogue grey `#D6D6D4` (RGB 214, 214, 212) so every card matches. Series cards that were already extended are rewritten to that grey on API start. Homepage featured series, `/products/[type]` series cards, `/products` type cards, and the admin lists use only this 16:9 file.

Older series `featured_image_datasheet` and `featured_image_source` values are still stored. Public series and datasheet views use them only when `featured_image_page` is empty.

On API start, a series whose series photo is empty and whose card photo (`featured_image`) is set gets that card file copied into `featured_image_page`. A product type whose type photo (`featured_image_source`) is empty and whose card photo is set gets that card file copied into `featured_image_source`. The card file stays, so public cards keep the 16:9 image and staff do not upload again. A row that already has its own source photo is left unchanged.

| Surface | Field | Frame |
|---------|-------|-------|
| Homepage featured series, `/products/[type]` cards, and `/admin/product-series` list | series `featured_image` | 16:9 |
| `/products` category cards and `/admin/product-types` list | type `featured_image` | 16:9 |
| `/products/[type]/[series]` gallery, family datasheet hero, option-list thumbs | series `featured_image_page` | The file’s own ratio. The series-page gallery trims large pure-white edges before layout |
| Type photo used only to build the category card | type `featured_image_source` | The file’s own ratio |

## Other upload locations

Every other staff image picker uses `requestCrop(file, frame)` before it uploads: size-pack and appearance photos, site assets, size-drawing style, catalog photo style, datasheet labels, and project photos.

The size-drawing AI **Focus the fixture** dialog stays a free-form box for the AI prompt. It is not this cutboard.

## Help tips

`admin.image_cutboard.apply`, `admin.image_cutboard.cancel`, `admin.product_series.series_photo`, `admin.product_series.series_photo_adjust`, `admin.product_series.card_extend`, `admin.product_series.featured_delete`, `admin.product_types.type_photo`, `admin.product_types.type_photo_adjust`, `admin.product_types.card_extend`, `admin.product_types.featured_delete`.

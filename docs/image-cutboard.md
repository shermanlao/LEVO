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
| `catalog` | 16:9 | Category featured images, and the series **card photo** made with Extend to 16:9 |
| `seriesPage` | photo’s own ratio | Series photo on the series page and datasheets. Adjust crop uses that file’s shape |
| `product` | 1:1 | Size-pack Main A/B, size drawing, and appearance photos |
| `project` | 16:9 | Project listing thumbnail |
| `projectSection` | 3:2 | Project gallery / section photos |
| `hero` | 3:2 | Homepage hero |
| `og` | 1.91:1 | Open Graph share image |
| `logo` | 3:1 | Header and PDF wordmarks |
| `icon` | 1:1 | Tab icon |
| `label` | 1:1 | Datasheet label squares |

## Series photos (two slots)

[`SeriesFeaturedImageEditor`](../frontend/src/components/admin/SeriesFeaturedImageEditor.tsx) on **Add New Series** (`/admin/product-series`) and **Edit** (`/admin/product-series/[id]/edit`) has two placeholders:

1. **Series photo** (`featured_image_page`). Drop, paste, or choose a file. The upload is saved as-is. The preview box uses that file’s own ratio, so a wide admin column does not add empty side bars. **Adjust crop** opens the photo with four edges. Drag one edge at a time to cut that side; the other three stay put. Apply saves the resulting shape. This file is the series-page gallery and the datasheet hero / thumbs.
2. **Card photo** (`featured_image`). The series and card placeholders are the same height. **Extend to 16:9** keeps that height and outpaints only the left and right background (`POST /api/admin/ai/edit-product-photo` with `outpaint`). The original series photo is pasted back afterward, so the top and bottom stay exactly as they were and the fixture is not stretched. The side strips are recolored to match the photo’s left and right edges. Homepage featured series and `/products/[type]` cards use only this 16:9 file.

Older `featured_image_datasheet` and `featured_image_source` values are still stored. Public series and datasheet views use them only when `featured_image_page` is empty.

On API start, a series whose series photo is empty and whose card photo (`featured_image`) is set gets that card file copied into `featured_image_page`. The card file stays, so category cards keep the 16:9 image and staff do not upload again. A series that already has its own series photo is left unchanged.

| Surface | Field | Frame |
|---------|-------|-------|
| Homepage featured series and `/products/[type]` cards | `featured_image` | 16:9 |
| `/products/[type]/[series]` gallery, family datasheet hero, option-list thumbs, `/admin/product-series` list | `featured_image_page` | The file’s own ratio. The series-page gallery trims large pure-white edges before layout |

## Other upload locations

Every other staff image picker uses `requestCrop(file, frame)` before it uploads: type featured images, size-pack and appearance photos, site assets, size-drawing style, catalog photo style, datasheet labels, and project photos.

The size-drawing AI **Focus the fixture** dialog stays a free-form box for the AI prompt. It is not this cutboard.

## Help tips

`admin.image_cutboard.apply`, `admin.image_cutboard.cancel`, `admin.product_series.series_photo`, `admin.product_series.series_photo_adjust`, `admin.product_series.card_extend`, `admin.product_series.featured_delete`.

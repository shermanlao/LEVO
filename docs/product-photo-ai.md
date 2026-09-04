# Product photo AI

On `/admin/product-series/[id]`, each size pack can generate a **size drawing** from Main A. Configure keys at `/admin/ai`.

## Size drawing

On the Size drawing slot, **Generate by AI**:

1. Main A, Dimensions (`dimensions` or the size label), and Cutout when series mounting is recessed / recess / inground
2. Focus crop on the main photo (starts full-frame)
3. Generate a 2D size drawing (white/transparent background; only provided dimensions)
4. Refine with chat, then **Apply** to `size_image`

Generate is an **image edit** of that crop (xAI `/images/edits` or Google image+text). The crop is a 3D product photo, so a weak “2D” line is not enough — the server always prepends a 2D elevation lock and the default templates forbid isometric/perspective. Templates are edited on `/admin/ai`.

Upload an optional **style reference** on `/admin/ai` (Size drawing style). When present, generate sends that drawing first and the product crop second, so the output follows the reference line style instead of the 3D photo.

## Appearance photos

On the same series page, **Generate missing** / **Generate all** (and upload of size Main A) edits Main A into Finish × Trim × Reflector **previews**. Staff must **Confirm** (or Confirm all) before a file is uploaded and stored. Discard leaves the previous saved photo. See [appearance-photos.md](appearance-photos.md).

## Main photo edit

In edit mode, click a filled **Main Image A** thumbnail. Chat instructions (or **Upscale**) edit the photo. **Apply** uploads and replaces the slot. Disabled until the preview differs from the original.

## Providers

Image generate/edit only runs on:

- **xAI Imagine** (`grok-imagine-image-quality`)
- **Google Gemini Image / Nano Banana** (`gemini-3.1-flash-image`)

OpenAI and OpenRouter keys can be stored for failover and routing but are not used for these image features.

## Datasheet labels

On `/admin/variant-options`, each datasheet square (IP, warranty, voltage, or a custom label) has **Generate by AI**. That calls text-to-image (or an edit if a badge is already uploaded). Apply uploads the PNG onto `variant_option_catalog.label_image` for that option.

## APIs (admin session)

- `POST /api/admin/ai/generate-size-drawing` `{ imageDataUrl, size, cuthole? }` → `{ imageDataUrl, mimeType }`
- `POST /api/admin/ai/refine-size-drawing` `{ imageDataUrl, size, cuthole?, instruction }`
- `POST /api/admin/ai/generate-appearance-photo` `{ imageDataUrl, colour?, trim_color?, reflector_finish? }` → `{ imageDataUrl, mimeType }`
- `POST /api/admin/ai/edit-product-photo` `{ imageDataUrl, instruction, photoType? }`
- `POST /api/admin/ai/generate-datasheet-label` `{ text, instruction?, imageDataUrl? }` → `{ imageDataUrl, mimeType }`
- `POST /api/admin/ai/generate-description-phrase` `{ guide, seriesName, typeName?, fields?, existing? }` → `{ phrase }`

Apply uses the existing `/api/upload` path so files stay under `frontend/public/images/products/` (series folder when a `seriesSlug` is sent). Size drawings store the path on the product row; datasheet labels store paths on `variant_option_catalog.label_image`.

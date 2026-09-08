# Product photo AI

On `/admin/product-series/[id]`, each size pack can generate a **size drawing** from Main A. **Add size** shows Main A, Main B, and Size drawing immediately. Upload, AI Apply, and Remove only stage the slot on the form; **Save variants** writes those paths onto the size pack. Configure keys at `/admin/ai`.

## Size drawing

On the Size drawing slot, **Generate by AI**:

1. Main A, Dimensions (`dimensions` or the size label), and Cutout when series mounting is recessed / recess / inground
2. Series **Description** and the filled **Phrase template** (this size pack plus other tags)
3. Focus crop on the main photo (starts full-frame)
4. Generate a 2D size drawing (white/transparent background; only provided dimensions)
5. Refine with chat, then **Apply** to `size_image`

Generate is an **image edit** of that crop (xAI `/images/edits` or Google image+text). The crop is a 3D product photo, so a weak “2D” line is not enough — the server always prepends a 2D elevation lock and the default templates forbid isometric/perspective. The series Description and filled phrase are always injected so the model knows fixture type, mounting, and form. Templates are edited on `/admin/ai`.

Upload an optional **style reference** on `/admin/ai` (Size drawing style). When present, generate sends that drawing first and the product crop second, so the output follows the reference line style instead of the 3D photo.

## Appearance photos

On the same series page, **Generate missing** / **Generate all** (and upload of size Main A) edits Main A into Finish × Trim × Reflector **previews**. Staff must **Confirm** (or Confirm all) before a file is uploaded and stored. Discard leaves the previous saved photo. See [appearance-photos.md](appearance-photos.md).

## Catalog photo style

Upload one house-style product photo on `/admin/ai` (**Catalog photo style**). That file is optional.

On `/admin/product-series/[id]`, size-pack **Main A** and **Main B** stage the cropped vendor file on the form. **Save variants** writes those paths. Filled Main A / Main B show **Match catalog style**. If no catalog style photo is stored, the button explains that `/admin/ai` needs one first. Staff can ignore it. The button:

1. Sends a JPEG (longest edge 1600) plus the stored path, the filled **Phrase template** (`fixtureDescription`), and the **placeholder size** (`placeholderSize`: square 1:1, 1600×1600, same as Main A / Main B) to `POST /api/admin/ai/stylize-product-photo`. The phrase uses this size pack’s dimensions / cutout and joins the other series tags (`phraseSpecFromOptionDrafts`). The API first asks a chat/vision model to **describe the original photo**, then shrinks the catalog style reference and fills the stored **Catalog photo style prompt** from `/admin/ai` (`{{hints_line}}`, `{{placeholder_size}}`; empty or a previous built-in default uses the 3-step prompt). A lock is always prepended so xAI treats `<IMAGE_0>` as the **ORIGINAL PHOTO** and `<IMAGE_1>` as the **REFERENCE PHOTO** (look/scene only). The filled phrase, photo description, and placeholder size are always injected. The default prompt is: remove hidden install parts and cut out; polish the cutout only; place it into the reference-style surround at real-world scale, filling the square catalog slot. One photo uses `image: { url, type }`; two use `image: ["data:…", "data:…"]`.
2. Shows a preview. **Apply** replaces the slot. **Reset** or Close keeps the original upload
3. Failures show the provider message (not a generic “Server error”). “Saved key cannot be read” means the xAI/Google key on `/admin/ai` is stored but cannot be decrypted — paste it again and Test connection. A missing catalog style photo is a separate 400.

The model copies the reference website style (ceiling/wall, camera distance, grading) after a clean cutout. It must keep this fixture’s identity from the original photo plus the phrase and the AI photo description — not flatten to a size drawing or paste the reference product. Appearance, featured, and project slots are unchanged.

## Providers

Image generate/edit only runs on:

- **xAI Imagine** (`grok-imagine-image-quality`)
- **Google Gemini Image / Nano Banana** (`gemini-3.1-flash-image`)

OpenAI and OpenRouter keys can be stored for failover and routing but are not used for these image features.

## Datasheet labels

On `/admin/variant-options`, each datasheet square (IP, warranty, voltage, or a custom label) has **Generate by AI**. That calls text-to-image (or an edit if a badge is already uploaded). Apply uploads the PNG onto `variant_option_catalog.label_image` for that option.

## APIs (admin session or Catalog page)

Generate / refine / stylize on a series or variant page need **Catalog** or **AI**. Settings, usage, and style uploads on `/admin/ai` need **AI**. A **Forbidden** result means the role has neither page.

- `POST /api/admin/ai/generate-size-drawing` `{ imageDataUrl, size, cuthole?, description?, fixtureDescription? }` → `{ imageDataUrl, mimeType }`
- `POST /api/admin/ai/refine-size-drawing` `{ imageDataUrl, size, cuthole?, description?, fixtureDescription?, instruction }`
- `POST /api/admin/ai/generate-appearance-photo` `{ imageDataUrl, colour?, trim_color?, reflector_finish? }` → `{ imageDataUrl, mimeType }`
- `POST /api/admin/ai/edit-product-photo` `{ imageDataUrl, instruction, photoType? }`
- `POST /api/admin/ai/stylize-product-photo` `{ imageDataUrl, imageUrl?, fixtureDescription?, placeholderSize? }` — optional Main A / B restyle. Send a data URL and/or a local `/images/` or `/uploads/` path, plus the filled series phrase. The server describes the original photo first, then runs the 3-step style prompt, including the square 1:1 placeholder size (1600×1600 if omitted). 400 if no catalog style photo is stored.
- `POST /api/admin/ai/generate-datasheet-label` `{ text, instruction?, imageDataUrl? }` → `{ imageDataUrl, mimeType }`
- `POST /api/admin/ai/generate-description-phrase` `{ guide, seriesName, typeName?, fields?, existing? }` → `{ phrase }`

Apply uses the existing `/api/upload` path so files stay under `frontend/public/images/products/` (series folder when a `seriesSlug` is sent). Size-pack slots keep that path on the form until **Save variants** writes it on the product row. Datasheet labels store paths on `variant_option_catalog.label_image` when Apply is used on Variant.

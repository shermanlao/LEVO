# Product photo AI

On `/admin/product-series/[id]`, each size pack can generate a **size drawing** from a product photo. **Add size** shows Size drawing immediately. Upload, AI Apply, and Remove only stage the drawing on the form; **Save variants** writes `size_image` onto the size pack. Product photos live in Appearance photos. Configure keys at `/admin/ai`.

## Size drawing

On the Size drawing slot, **Generate by AI**:

1. A product photo tagged with this size (else any appearance photo, else the series featured photo), Dimensions (`dimensions` or the size label), and Cutout when series mounting is recessed / recess / inground
2. Series **Description** and the filled **Phrase template** (this size pack plus other tags)
3. Focus crop on the product photo (starts full-frame)
4. Generate a 2D size drawing (white/transparent background; only provided dimensions)
5. Refine with chat, then **Apply** to `size_image`

Generate is an **image edit** of that crop (xAI `/images/edits` or Google image+text). The crop is a 3D product photo, so a weak “2D” line is not enough — the server always prepends a 2D elevation lock and the default templates forbid isometric/perspective. The series Description and filled phrase are always injected so the model knows fixture type, mounting, and form. Templates are edited on `/admin/ai`.

Upload an optional **style reference** on `/admin/ai` (Size drawing style). When present, generate sends that drawing first and the product crop second, so the output follows the reference line style instead of the 3D photo.

## Appearance photos

On the same series page, **Generate by AI** on a tagged library photo edits that card (or another library photo if the slot is empty, then the series photo) using Finish / Trim / Reflector tags when they are set. Staff must **Confirm** (or Confirm all) before the preview is stored. Discard leaves the previous saved photo. Filled photos also show **Match catalog style**. See [appearance-photos.md](appearance-photos.md).

## Card photo

On Add / Edit series and Add / Edit product type, **Extend to 16:9** builds `featured_image` from the source photo (series: `featured_image_page`; type: `featured_image_source`). The two placeholders share one height. The browser keeps that height and adds blank canvas only on the left and right, then `POST /api/admin/ai/edit-product-photo` with `outpaint` fills that side background. The original source photo is then **feathered** into that canvas (cosine blend, about 18% of the original width on each join, capped at one third) so the fixture stays and there is no hard rectangle. Side strips take **this photo’s sampled ceiling** colour (fallback `#D6D6D4`, RGB 214, 214, 212); blank white pads fill with that sample. The original interior is not flattened. White trim, warm lamps, and the fixture stay. Homepage featured series, `/products/[type]` series cards, `/products` type cards, and the admin lists use that 16:9 file. The series page and datasheets keep the series photo at its own ratio. Cards that still show a boxed join (or were flattened by an older grey pass) are rebuilt on API start from the source photo (and with `npm run cards:unify-grey` in `backend-server`). Files whose middle still has grain and whose join is already smooth are left as they are.

## Edit with AI

On Add / Edit series and Add / Edit product type, click the **source photo** or the **Card photo** to open **Edit photo with AI** (the same chat as a LIGHTX product photo). The dialog is drawn outside the parent form, and **Send** is not a form submit, so it does not reload the page. Describe the change and Send, or Upscale. Apply uploads the preview into that slot and, on an existing series or type, saves it immediately. Reset or Close keeps the current file. Empty placeholders still drop, paste, or choose a file. Size drawings still use **Generate by AI** and its refine chat. On `/admin/product-series/[id]`, click a filled **appearance photo** to open the same Edit photo with AI chat; Apply saves that library photo immediately. Appearance photos also have **Match catalog style**. Other admin thumbs still enlarge on click.

## Catalog photo style

Upload one house-style product photo on `/admin/ai` (**Catalog photo style**). That file is optional.

On `/admin/product-series/[id]`, filled **appearance photos** show **Match catalog style**. If no catalog style photo is stored, the button explains that `/admin/ai` needs one first. Staff can ignore it. The button:

1. Sends a JPEG (longest edge 1600) plus the stored path, the filled **Phrase template** (`fixtureDescription`), and the **placeholder size** (`placeholderSize`: square 1:1, 1600×1600) to `POST /api/admin/ai/stylize-product-photo`. The phrase joins the series tags (`phraseSpecFromOptionDrafts`). The API first asks a chat/vision model to **describe the original photo**, then shrinks the catalog style reference and fills the stored **Catalog photo style prompt** from `/admin/ai` (`{{hints_line}}`, `{{placeholder_size}}`; empty or a previous built-in default uses the 3-step prompt). A lock is always prepended so xAI treats `<IMAGE_0>` as the **ORIGINAL PHOTO** and `<IMAGE_1>` as the **REFERENCE PHOTO** (look/scene only). The filled phrase, photo description, and placeholder size are always injected. The default prompt is: remove hidden install parts and cut out; polish the cutout only; place it into the reference-style surround at real-world scale, filling the square catalog slot. One photo uses `image: { url, type }`; two use `image: ["data:…", "data:…"]`.
2. Shows a preview. Staff can **Refine** with chat (`POST /api/admin/ai/edit-product-photo` on the current preview) to adjust light, crop, scene, etc. **Apply** replaces the slot. **Reset** or Close keeps the original upload
3. Failures show the provider message (not a generic “Server error”). “Saved key cannot be read” means the xAI/Google key on `/admin/ai` is stored but cannot be decrypted — paste it again and Test connection. A missing catalog style photo is a separate 400.

The model copies the reference website style (ceiling/wall, camera distance, grading) after a clean cutout. It must keep this fixture’s identity from the original photo plus the phrase and the AI photo description — not flatten to a size drawing or paste the reference product. The series **Style photo** uses this same stylize call, then Apply extends that result into a location frame. Project slots are unchanged.

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
- `POST /api/admin/ai/edit-product-photo` `{ imageDataUrl, instruction, photoType?, outpaint? }` — chat refine, or extend a style photo into a location frame. `outpaint` is `{ aspect, axis: "horizontal" | "vertical" }` and does not need `instruction`.
- `POST /api/admin/ai/stylize-product-photo` `{ imageDataUrl, imageUrl?, fixtureDescription?, placeholderSize? }` — optional appearance-photo restyle. Send a data URL and/or a local `/images/` or `/uploads/` path, plus the filled series phrase. The server describes the original photo first, then runs the 3-step style prompt, including the square 1:1 placeholder size (1600×1600 if omitted). 400 if no catalog style photo is stored.
- `POST /api/admin/ai/generate-datasheet-label` `{ text, instruction?, imageDataUrl? }` → `{ imageDataUrl, mimeType }`
- `POST /api/admin/ai/generate-description-phrase` `{ guide, seriesName, typeName?, fields?, existing? }` → `{ phrase }`

Apply uses the existing `/api/upload` path so files stay under `frontend/public/images/products/` (series folder when a `seriesSlug` is sent). Size drawings keep that path on the form until **Save variants** writes it on the product row. Appearance photos save immediately. Datasheet labels store paths on `variant_option_catalog.label_image` when Apply is used on Variant.

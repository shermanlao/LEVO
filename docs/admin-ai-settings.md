# Admin AI settings

Staff configure AI at `/admin/ai` (same session as the rest of `/admin`).

## What it stores

SQLite table `ai_provider_settings` (singleton):

- Default provider, base URL, model
- Per-provider API keys (`xai`, `openai`, `google`, `openrouter`) encrypted with `AI_SETTINGS_ENCRYPTION_KEY` (or `ADMIN_SESSION_SECRET` / a local fallback)
- Feature routing for `size_drawing_generate`, `product_photo_edit`, `appearance_photo_generate`, `datasheet_label_generate`, and `description_phrase_generate`
- Organization parsing hints (injected into size-drawing and photo-edit prompts)
- Size drawing generate and refine prompt templates (`size_drawing_prompt`, `size_drawing_refine_prompt`). Empty stored values fall back to the built-in defaults. Placeholders: `{{size}}`, `{{cuthole_line}}`, `{{hints_line}}`, `{{instruction}}` (refine only). Generate/refine always prepends a 2D elevation lock so the 3D main photo is not copied as an isometric sketch.
- Optional size-drawing **style reference** photo (`size_drawing_style_image`). Upload on `/admin/ai` stores `/images/ai/size-drawing-style.{png|jpg|webp|gif}`. Generate by AI sends that image first (style) and the product crop second (outline).

Env `AI_API_KEY` + `AI_PROVIDER` override the matching provider when set. Optional: `AI_API_BASE_URL`, `AI_MODEL_ID`.

## Failover

Feature primary → org default → `xai` → `openai` → `openrouter` → `google` (skip missing keys). **Size drawing, photo edit, and datasheet labels still only execute on xAI Imagine or Google Gemini Image.** Description phrases use chat completions and can run on any configured provider.

## Usage

The page shows request count, tokens, estimated USD, and a by-feature table. Image calls log provider-reported USD when xAI returns it. Period: 7 / 30 / 90 days or all time.

## APIs (admin session)

- `GET/PUT /api/admin/ai/settings`
- `POST /api/admin/ai/size-drawing-style` — multipart `file`; saves the style reference
- `DELETE /api/admin/ai/size-drawing-style` — clears the style reference
- `POST /api/admin/ai/settings/test` — saves the submitted keys (same body as PUT), then calls the provider. Returns `401`-style provider errors instead of a generic “not configured” when a key is present.
- `GET /api/admin/ai/usage?period=30d`
- `POST /api/admin/ai/generate-datasheet-label` `{ text, instruction?, imageDataUrl? }` — Variant page badge generate/refine
- `POST /api/admin/ai/generate-description-phrase` `{ guide, seriesName, typeName?, fields?, existing? }` → `{ phrase }` — series variants page phrase template from guide words

PUT body may include `provider_keys: { xai: "…" }` (plaintext once; never returned), `feature_model_routing`, `size_drawing_prompt`, and `size_drawing_refine_prompt`. GET returns filled defaults when those prompt columns are empty, plus `size_drawing_prompt_default` / `size_drawing_refine_prompt_default` for Reset.

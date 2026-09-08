# Admin AI settings

Staff configure AI at `/admin/ai` (same session as the rest of `/admin`). The page lives in [`AiSettingsPage.tsx`](../frontend/src/components/admin/AiSettingsPage.tsx).

## What it stores

SQLite table `ai_provider_settings` (singleton):

- Default provider, base URL, model
- Per-provider API keys (`xai`, `openai`, `google`, `openrouter`) encrypted with `AI_SETTINGS_ENCRYPTION_KEY` (or `ADMIN_SESSION_SECRET` / a local fallback)
- Feature routing for `size_drawing_generate`, `product_photo_edit`, `appearance_photo_generate`, `datasheet_label_generate`, and `description_phrase_generate`. Catalog photo style uses the `product_photo_edit` provider (no extra dropdown).
- Organization parsing hints (injected into size-drawing and photo-edit prompts)
- Size drawing generate and refine prompt templates (`size_drawing_prompt`, `size_drawing_refine_prompt`). Empty stored values fall back to the built-in defaults. Placeholders: `{{size}}`, `{{cuthole_line}}`, `{{hints_line}}`, `{{instruction}}` (refine only). Generate/refine always prepends a 2D elevation lock so the 3D main photo is not copied as an isometric sketch.
- Optional size-drawing **style reference** photo (`size_drawing_style_image`). Upload on `/admin/ai` stores `/images/ai/size-drawing-style.{png|jpg|webp|gif}`. The placeholder accepts drop, clipboard paste, or a chosen file. Generate by AI sends that image first (style) and the product crop second (outline).
- Optional catalog **photo style** (`product_photo_style_image`) plus an editable prompt (`product_photo_style_prompt`). Upload on `/admin/ai` stores `/images/ai/product-photo-style.{png|jpg|webp|gif}`. The placeholder accepts drop, clipboard paste, or a chosen file. The prompt sits under that card (same Reset-to-default pattern as size drawing). Empty stored values use the built-in default. Placeholder: `{{hints_line}}`. A lock is always prepended so the style photo stays look-only. Match catalog style on Main A / Main B is optional and never required to save an upload. Style match shrinks both photos to JPEG (max edge 1600) before the provider call. xAI gets the product as `<IMAGE_0>` and the style reference as `<IMAGE_1>` (`sourceFirst`). Failures show the provider text instead of a generic server error.

Env `AI_API_KEY` + `AI_PROVIDER` override the matching provider when set. Optional: `AI_API_BASE_URL`, `AI_MODEL_ID`.

**Saved** on a key field means ciphertext (or an env override) exists. Image features still need a key that decrypts with the current `AI_SETTINGS_ENCRYPTION_KEY`. If that encryption secret changed, the form can say Saved while Match catalog style returns that the saved key cannot be read — paste the xAI or Google key again and click **Test connection**. The dashboard **AI** card opens this page.

## Failover

Feature primary → org default → `xai` → `openai` → `openrouter` → `google` (skip missing keys). **Size drawing, photo edit, and datasheet labels still only execute on xAI Imagine or Google Gemini Image.** Description phrases use chat completions and can run on any configured provider.

## Usage

The page shows request count, tokens, estimated USD, and a by-feature table for the selected period (7 / 30 / 90 days or all time). Totals include every matching `ai_token_usage_log` row (no 500-row cap).

Cost:

- **xAI** uses the billed amount from `usage.cost_in_usd_ticks` (1 USD = 10,000,000,000 ticks). Older rows that stored ticks ÷ 1,000,000 (about $500–$600 per image) are rewritten to the real dollars ($0.05–$0.06) the next time `/admin/ai` loads.
- **Google Gemini Image** estimates USD from `usageMetadata` (input $0.50 / 1M tokens, text/thinking $3 / 1M, image output $60 / 1M on `gemini-3.1-flash-image`).
- **Description phrases** store chat token counts and, on xAI, billed ticks. If ticks were missing, Grok 4.3 rows estimate from $1.25 / $2.50 per 1M input/output tokens.

Image calls often have no token count (xAI bills per image). Tokens on the page are the sum of provider-reported token fields only.

## APIs (admin session)

- `GET/PUT /api/admin/ai/settings`
- `POST /api/admin/ai/size-drawing-style` — multipart `file`; saves the size-drawing style reference
- `DELETE /api/admin/ai/size-drawing-style` — clears the size-drawing style reference
- `POST /api/admin/ai/product-photo-style` — multipart `file`; saves the catalog photo style
- `DELETE /api/admin/ai/product-photo-style` — clears the catalog photo style
- `POST /api/admin/ai/settings/test` — saves the submitted keys (same body as PUT), then calls the provider. Returns `401`-style provider errors instead of a generic “not configured” when a key is present.
- `GET /api/admin/ai/usage?period=30d`
- `POST /api/admin/ai/generate-datasheet-label` `{ text, instruction?, imageDataUrl? }` — Variant page badge generate/refine
- `POST /api/admin/ai/generate-description-phrase` `{ guide, seriesName, typeName?, fields?, existing? }` → `{ phrase }` — series variants page phrase template from guide words

PUT body may include `provider_keys: { xai: "…" }` (plaintext once; never returned), `feature_model_routing`, `size_drawing_prompt`, `size_drawing_refine_prompt`, and `product_photo_style_prompt`. GET returns filled defaults when those prompt columns are empty, plus `size_drawing_prompt_default` / `size_drawing_refine_prompt_default` / `product_photo_style_prompt_default` for Reset.

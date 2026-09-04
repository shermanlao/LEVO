import { Request, Response } from 'express';
import { errorMessage, clientError } from '../lib/errors';
import {
  AI_USAGE_FEATURE_LABELS,
  AI_USAGE_FEATURES,
  isAiProviderKeyId,
} from '../lib/ai/aiConstants';
import {
  clearEncryptedProviderKey,
  parseEncryptedProviderKeysMap,
  providerKeyPresence,
  setEncryptedProviderKey,
} from '../lib/ai/aiProviderKeys';
import { hasImageAiApiKeyInEnv, getImageAiProviderFromEnv } from '../lib/ai/imageAiEnv';
import {
  getImageAiProviderPreset,
  listImageAiProviderPresets,
  normalizeImageAiModelId,
  normalizeImageAiProviderId,
} from '../lib/ai/imageAiProviders';
import {
  getOrCreateAiSettings,
  parseFeatureRouting,
  resolveImageAiCredentials,
  type FeatureRouting,
} from '../lib/ai/resolveCredentials';
import { summarizeAiUsage } from '../lib/ai/aiUsage';
import { testAiConnection } from '../lib/ai/aiImageGeneration';
import {
  DEFAULT_SIZE_DRAWING_PROMPT,
  DEFAULT_SIZE_DRAWING_REFINE_PROMPT,
} from '../lib/ai/sizeDrawingPrompts';
import {
  deleteSizeDrawingStyleImage,
  resolveSizeDrawingStylePathOnDisk,
  writeSizeDrawingStyleImage,
} from '../lib/ai/sizeDrawingStyleImage';
import multer from 'multer';

function serializeSettings() {
  return getOrCreateAiSettings().then((row) => {
    const map = parseEncryptedProviderKeysMap(row.get('encrypted_provider_keys'));
    const envProvider = getImageAiProviderFromEnv();
    const routing = parseFeatureRouting(row.get('feature_model_routing'));
    return {
      provider: String(row.get('provider') || 'xai'),
      base_url: String(row.get('base_url') || ''),
      model_id: String(row.get('model_id') || ''),
      parsing_hints: String(row.get('parsing_hints') || ''),
      size_drawing_prompt:
        String(row.get('size_drawing_prompt') || '').trim() || DEFAULT_SIZE_DRAWING_PROMPT,
      size_drawing_refine_prompt:
        String(row.get('size_drawing_refine_prompt') || '').trim() || DEFAULT_SIZE_DRAWING_REFINE_PROMPT,
      size_drawing_prompt_default: DEFAULT_SIZE_DRAWING_PROMPT,
      size_drawing_refine_prompt_default: DEFAULT_SIZE_DRAWING_REFINE_PROMPT,
      size_drawing_style_image: resolveSizeDrawingStylePathOnDisk(
        String(row.get('size_drawing_style_image') || '')
      )
        ? String(row.get('size_drawing_style_image'))
        : null,
      key_presence: providerKeyPresence(map, {
        envProvider,
        hasEnvKey: hasImageAiApiKeyInEnv(),
      }),
      env_key_overrides: hasImageAiApiKeyInEnv(),
      env_provider: envProvider || null,
      feature_model_routing: routing,
      features: AI_USAGE_FEATURES.map((id) => ({ id, label: AI_USAGE_FEATURE_LABELS[id] })),
      presets: listImageAiProviderPresets(),
    };
  });
}

export const getAiSettings = async (_req: Request, res: Response) => {
  try {
    res.json({ data: await serializeSettings() });
  } catch (error) {
    res.status(500).json({ error: clientError(error) });
  }
};

type SettingsUpdateBody = {
  provider?: string;
  base_url?: string;
  model_id?: string;
  parsing_hints?: string;
  size_drawing_prompt?: string;
  size_drawing_refine_prompt?: string;
  provider_keys?: Record<string, string | null>;
  clear_keys?: string[];
  feature_model_routing?: FeatureRouting;
};

async function applySettingsUpdate(body: SettingsUpdateBody) {
  const row = await getOrCreateAiSettings();
  const provider = body.provider
    ? normalizeImageAiProviderId(body.provider)
    : String(row.get('provider') || 'xai');
  const preset = getImageAiProviderPreset(provider);
  let map = parseEncryptedProviderKeysMap(row.get('encrypted_provider_keys'));
  if (body.provider_keys && typeof body.provider_keys === 'object') {
    for (const [id, value] of Object.entries(body.provider_keys)) {
      if (!isAiProviderKeyId(id)) continue;
      map = setEncryptedProviderKey(map, id, value);
    }
  }
  if (Array.isArray(body.clear_keys)) {
    for (const id of body.clear_keys) {
      if (isAiProviderKeyId(id)) map = clearEncryptedProviderKey(map, id);
    }
  }
  await row.update({
    provider,
    base_url: body.base_url?.trim() || preset.baseUrl,
    model_id: normalizeImageAiModelId(body.model_id, provider),
    parsing_hints: body.parsing_hints ?? String(row.get('parsing_hints') || ''),
    size_drawing_prompt:
      body.size_drawing_prompt !== undefined
        ? body.size_drawing_prompt
        : String(row.get('size_drawing_prompt') || ''),
    size_drawing_refine_prompt:
      body.size_drawing_refine_prompt !== undefined
        ? body.size_drawing_refine_prompt
        : String(row.get('size_drawing_refine_prompt') || ''),
    encrypted_provider_keys: JSON.stringify(map),
    feature_model_routing: JSON.stringify(
      body.feature_model_routing || parseFeatureRouting(row.get('feature_model_routing'))
    ),
  });
  return serializeSettings();
}

export const updateAiSettings = async (req: Request, res: Response) => {
  try {
    res.json({ data: await applySettingsUpdate((req.body || {}) as SettingsUpdateBody) });
  } catch (error) {
    res.status(500).json({ error: clientError(error) });
  }
};

export const testAiSettings = async (req: Request, res: Response) => {
  try {
    const body = (req.body || {}) as SettingsUpdateBody;
    if (body.provider || body.provider_keys || body.base_url || body.model_id) {
      await applySettingsUpdate(body);
    }
    const creds = await resolveImageAiCredentials();
    if (!creds) {
      return res.status(400).json({
        ok: false,
        error:
          'No API key for the default provider. Paste the xAI (or Google) key in the form, then click Test connection.',
      });
    }
    const result = await testAiConnection(creds);
    res.json({ ...result, data: await serializeSettings() });
  } catch (error) {
    res.status(400).json({ ok: false, error: errorMessage(error) });
  }
};

const STYLE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const sizeDrawingStyleUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!STYLE_MIME.has(file.mimetype)) {
      cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
      return;
    }
    cb(null, true);
  },
});

export const uploadSizeDrawingStyle = async (req: Request, res: Response) => {
  try {
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file?.buffer?.length) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    const row = await getOrCreateAiSettings();
    deleteSizeDrawingStyleImage(String(row.get('size_drawing_style_image') || ''));
    const stored = writeSizeDrawingStyleImage(file.buffer, file.mimetype);
    await row.update({ size_drawing_style_image: stored });
    res.json({ data: await serializeSettings() });
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
};

export const deleteSizeDrawingStyle = async (_req: Request, res: Response) => {
  try {
    const row = await getOrCreateAiSettings();
    deleteSizeDrawingStyleImage(String(row.get('size_drawing_style_image') || ''));
    await row.update({ size_drawing_style_image: null });
    res.json({ data: await serializeSettings() });
  } catch (error) {
    res.status(500).json({ error: clientError(error) });
  }
};

export const getAiUsage = async (req: Request, res: Response) => {
  try {
    const period = String(req.query.period || '30d');
    const days = period === 'all' ? null : period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const summary = await summarizeAiUsage(days);
    res.json({ data: summary, period });
  } catch (error) {
    res.status(500).json({ error: clientError(error) });
  }
};

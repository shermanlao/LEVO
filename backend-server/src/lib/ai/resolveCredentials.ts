import AiProviderSettings from '../../models/AiProviderSettings';
import {
  AI_PROVIDER_SETTINGS_ID,
  AI_USAGE_FEATURES,
  type AiUsageFeature,
  isAiProviderKeyId,
} from './aiConstants';
import {
  decryptProviderKey,
  parseEncryptedProviderKeysMap,
  type EncryptedProviderKeysMap,
} from './aiProviderKeys';
import {
  getImageAiApiKeyFromEnv,
  getImageAiProviderFromEnv,
  hasImageAiApiKeyInEnv,
} from './imageAiEnv';
import {
  getImageAiProviderPreset,
  normalizeImageAiModelId,
  normalizeImageAiProviderId,
} from './imageAiProviders';
import {
  DEFAULT_SIZE_DRAWING_PROMPT,
  DEFAULT_SIZE_DRAWING_REFINE_PROMPT,
} from './sizeDrawingPrompts';

export type ResolvedImageAiCredentials = {
  provider: string;
  apiKey: string;
  baseUrl: string;
  modelId: string;
};

export type FeatureRouting = Partial<
  Record<AiUsageFeature, { provider?: string; modelId?: string }>
>;

export async function getOrCreateAiSettings() {
  let row = await AiProviderSettings.findByPk(AI_PROVIDER_SETTINGS_ID);
  if (!row) {
    row = await AiProviderSettings.create({
      id: AI_PROVIDER_SETTINGS_ID,
      provider: 'xai',
      base_url: getImageAiProviderPreset('xai').baseUrl,
      model_id: getImageAiProviderPreset('xai').modelId,
      encrypted_provider_keys: '{}',
      feature_model_routing: '{}',
      parsing_hints: '',
    });
  }
  return row;
}

export function parseFeatureRouting(raw: unknown): FeatureRouting {
  if (typeof raw === 'string') {
    try {
      return parseFeatureRouting(JSON.parse(raw));
    } catch {
      return {};
    }
  }
  if (!raw || typeof raw !== 'object') return {};
  const out: FeatureRouting = {};
  for (const feature of AI_USAGE_FEATURES) {
    const entry = (raw as Record<string, unknown>)[feature];
    if (!entry || typeof entry !== 'object') continue;
    const rec = entry as { provider?: string; modelId?: string };
    out[feature] = {
      provider: rec.provider ? normalizeImageAiProviderId(rec.provider) : undefined,
      modelId: rec.modelId || undefined,
    };
  }
  return out;
}

function keyForProvider(
  map: EncryptedProviderKeysMap,
  provider: string,
  orgProvider: string
): string | null {
  const envProvider = getImageAiProviderFromEnv() || (hasImageAiApiKeyInEnv() ? orgProvider : undefined);
  if (
    hasImageAiApiKeyInEnv() &&
    envProvider &&
    normalizeImageAiProviderId(envProvider) === normalizeImageAiProviderId(provider)
  ) {
    return getImageAiApiKeyFromEnv();
  }
  return decryptProviderKey(map, provider);
}

export async function listFailoverCredentials(feature?: string): Promise<ResolvedImageAiCredentials[]> {
  const row = await getOrCreateAiSettings();
  const map = parseEncryptedProviderKeysMap(row.get('encrypted_provider_keys'));
  const orgProvider = normalizeImageAiProviderId(String(row.get('provider') || 'xai'));
  const routing = parseFeatureRouting(row.get('feature_model_routing'));
  const featureRoute = feature ? routing[feature as AiUsageFeature] : undefined;
  const order = [
    featureRoute?.provider,
    orgProvider,
    'xai',
    'openai',
    'openrouter',
    'google',
  ].filter(Boolean) as string[];

  const seen = new Set<string>();
  const creds: ResolvedImageAiCredentials[] = [];
  for (const provider of order) {
    const id = normalizeImageAiProviderId(provider);
    if (seen.has(id)) continue;
    seen.add(id);
    const apiKey = keyForProvider(map, id, orgProvider);
    if (!apiKey) continue;
    const preset = getImageAiProviderPreset(id);
    const isOrg = id === orgProvider;
    creds.push({
      provider: id,
      apiKey,
      baseUrl: (isOrg && String(row.get('base_url') || '')) || preset.baseUrl,
      modelId: normalizeImageAiModelId(
        (featureRoute?.provider === id ? featureRoute.modelId : undefined) ||
          (isOrg ? String(row.get('model_id') || '') : '') ||
          preset.modelId,
        id
      ),
    });
  }
  return creds;
}

export async function resolveImageAiCredentials(
  feature?: string
): Promise<ResolvedImageAiCredentials | null> {
  const list = await listFailoverCredentials(feature);
  return list[0] || null;
}

export async function getParsingHints(): Promise<string> {
  const row = await getOrCreateAiSettings();
  return String(row.get('parsing_hints') || '').trim();
}

export async function getSizeDrawingPromptTemplates(): Promise<{ generate: string; refine: string }> {
  const row = await getOrCreateAiSettings();
  const generate = String(row.get('size_drawing_prompt') || '').trim();
  const refine = String(row.get('size_drawing_refine_prompt') || '').trim();
  return {
    generate: generate || DEFAULT_SIZE_DRAWING_PROMPT,
    refine: refine || DEFAULT_SIZE_DRAWING_REFINE_PROMPT,
  };
}

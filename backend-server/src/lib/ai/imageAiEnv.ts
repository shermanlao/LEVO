import {
  DEFAULT_IMAGE_AI_PROVIDER_ID,
  getImageAiProviderPreset,
  normalizeImageAiProviderId,
  normalizeImageAiModelId,
} from './imageAiProviders';

export function getImageAiApiKeyFromEnv(): string {
  return (
    process.env.AI_API_KEY?.trim() ||
    process.env.IMAGE_AI_API_KEY?.trim() ||
    process.env.XAI_API_KEY?.trim() ||
    ''
  );
}

export function hasImageAiApiKeyInEnv(): boolean {
  return getImageAiApiKeyFromEnv().length > 0;
}

export function getImageAiProviderFromEnv(): string | undefined {
  const value = process.env.AI_PROVIDER?.trim() || process.env.IMAGE_AI_PROVIDER?.trim();
  return value ? normalizeImageAiProviderId(value) : undefined;
}

export function resolveImageAiEndpointFromEnv(): {
  provider: string;
  baseUrl: string;
  modelId: string;
} {
  const provider = getImageAiProviderFromEnv() ?? DEFAULT_IMAGE_AI_PROVIDER_ID;
  const preset = getImageAiProviderPreset(provider);
  const baseUrl = (process.env.AI_API_BASE_URL?.trim() || preset.baseUrl).replace(/\/$/, '');
  const modelId = normalizeImageAiModelId(process.env.AI_MODEL_ID, provider);
  return { provider: preset.id, baseUrl, modelId };
}

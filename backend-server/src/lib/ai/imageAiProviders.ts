export interface ImageAiProviderPreset {
  id: string;
  label: string;
  baseUrl: string;
  modelId: string;
}

export const IMAGE_AI_PROVIDER_PRESETS: Record<string, ImageAiProviderPreset> = {
  xai: {
    id: 'xai',
    label: 'xAI',
    baseUrl: 'https://api.x.ai/v1',
    modelId: 'grok-4.3',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    modelId: 'gpt-4o',
  },
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    modelId: 'openai/gpt-4o',
  },
  google: {
    id: 'google',
    label: 'Google (Gemini)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    modelId: 'gemini-2.0-flash',
  },
};

export const DEFAULT_IMAGE_AI_PROVIDER_ID = 'xai';

export function normalizeImageAiProviderId(value: string | null | undefined): string {
  const id = (value ?? '').trim().toLowerCase();
  if (!id) return DEFAULT_IMAGE_AI_PROVIDER_ID;
  if (id in IMAGE_AI_PROVIDER_PRESETS) return id;
  if (id === 'x.ai' || id === 'grok') return 'xai';
  return id;
}

export function getImageAiProviderPreset(providerId: string | null | undefined): ImageAiProviderPreset {
  const id = normalizeImageAiProviderId(providerId);
  return (
    IMAGE_AI_PROVIDER_PRESETS[id] ?? {
      id,
      label: id,
      baseUrl: 'https://api.x.ai/v1',
      modelId: 'grok-4.3',
    }
  );
}

export function listImageAiProviderPresets(): ImageAiProviderPreset[] {
  return Object.values(IMAGE_AI_PROVIDER_PRESETS);
}

export function normalizeImageAiModelId(
  modelId: string | null | undefined,
  providerId: string | null | undefined
): string {
  const trimmed = (modelId ?? '').trim();
  const provider = normalizeImageAiProviderId(providerId);
  if (!trimmed) return getImageAiProviderPreset(provider).modelId;
  return trimmed;
}

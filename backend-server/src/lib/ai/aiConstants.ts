export const AI_PROVIDER_KEY_IDS = ['xai', 'openai', 'google', 'openrouter'] as const;
export type AiProviderKeyId = (typeof AI_PROVIDER_KEY_IDS)[number];

export type ProviderKeyPresence = Record<AiProviderKeyId, boolean>;

export function isAiProviderKeyId(value: string): value is AiProviderKeyId {
  return (AI_PROVIDER_KEY_IDS as readonly string[]).includes(value);
}

export const AI_USAGE_FEATURES = [
  'size_drawing_generate',
  'product_photo_edit',
  'appearance_photo_generate',
  'datasheet_label_generate',
  'description_phrase_generate',
  'connection_test',
] as const;

export type AiUsageFeature = (typeof AI_USAGE_FEATURES)[number];

export const AI_USAGE_FEATURE_LABELS: Record<AiUsageFeature, string> = {
  size_drawing_generate: 'Size drawing',
  product_photo_edit: 'Product photo edit',
  appearance_photo_generate: 'Appearance photo',
  datasheet_label_generate: 'Datasheet label',
  description_phrase_generate: 'Description phrase',
  connection_test: 'Connection test',
};

export const AI_PROVIDER_SETTINGS_ID = 'singleton';

export const IMAGE_GEN_PROVIDERS = ['xai', 'google'] as const;

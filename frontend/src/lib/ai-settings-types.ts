export type AiSettings = {
  provider: string;
  base_url: string;
  model_id: string;
  parsing_hints: string;
  size_drawing_prompt: string;
  size_drawing_refine_prompt: string;
  size_drawing_prompt_default: string;
  size_drawing_refine_prompt_default: string;
  size_drawing_style_image: string | null;
  product_photo_style_image: string | null;
  key_presence: Record<string, boolean>;
  key_usable: Record<string, boolean>;
  env_key_overrides: boolean;
  env_provider: string | null;
  feature_model_routing: Record<string, { provider?: string; modelId?: string }>;
  features: Array<{ id: string; label: string }>;
  presets: Array<{ id: string; label: string; baseUrl: string; modelId: string }>;
};

export type AiUsage = {
  requestCount: number;
  totalTokens: number;
  estimatedUsd: number;
  byFeature: Record<string, { count: number; tokens: number; costUsd: number }>;
};

export type AiFeatureRouting = Record<string, { provider?: string; modelId?: string }>;

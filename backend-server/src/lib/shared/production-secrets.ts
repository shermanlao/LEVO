export const DEFAULT_SESSION_SECRET = 'levo-dev-admin-session';
export const DEFAULT_AI_SETTINGS_KEY = 'levo-local-ai-settings-key';
export const DEFAULT_ADMIN_PASSWORD = 'abc4321';
export const DEFAULT_INTERNAL_API_SECRET = 'levo-dev-internal';

export const INTERNAL_API_HEADER = 'x-levo-internal';

export function isProductionEnv(nodeEnv = process.env.NODE_ENV): boolean {
  return nodeEnv === 'production';
}

export function productionSecretErrors(env: NodeJS.ProcessEnv = process.env): string[] {
  if (env.NODE_ENV !== 'production') return [];
  const errors: string[] = [];
  const session = String(env.ADMIN_SESSION_SECRET || '').trim();
  if (!session || session === DEFAULT_SESSION_SECRET) {
    errors.push('ADMIN_SESSION_SECRET must be set to a non-default value');
  }
  const aiKey = String(env.AI_SETTINGS_ENCRYPTION_KEY || '').trim();
  if (!aiKey || aiKey === DEFAULT_AI_SETTINGS_KEY) {
    errors.push('AI_SETTINGS_ENCRYPTION_KEY must be set to a non-default value');
  }
  const internal = String(env.INTERNAL_API_SECRET || '').trim();
  if (!internal || internal === DEFAULT_INTERNAL_API_SECRET) {
    errors.push('INTERNAL_API_SECRET must be set to a non-default value');
  }
  return errors;
}

export function assertProductionSecrets(env: NodeJS.ProcessEnv = process.env): void {
  const errors = productionSecretErrors(env);
  if (errors.length === 0) return;
  throw new Error(`Refusing to start in production: ${errors.join('; ')}`);
}

export function resolveSessionSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = String(env.ADMIN_SESSION_SECRET || '').trim();
  if (env.NODE_ENV === 'production') {
    if (!secret || secret === DEFAULT_SESSION_SECRET) {
      throw new Error('ADMIN_SESSION_SECRET must be set to a non-default value in production');
    }
    return secret;
  }
  return secret || DEFAULT_SESSION_SECRET;
}

export function resolveAiSettingsKey(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = String(env.AI_SETTINGS_ENCRYPTION_KEY || '').trim();
  if (env.NODE_ENV === 'production') {
    if (!explicit || explicit === DEFAULT_AI_SETTINGS_KEY) {
      throw new Error('AI_SETTINGS_ENCRYPTION_KEY must be set to a non-default value in production');
    }
    return explicit;
  }
  return explicit || String(env.ADMIN_SESSION_SECRET || '').trim() || DEFAULT_AI_SETTINGS_KEY;
}

export function resolveInternalApiSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = String(env.INTERNAL_API_SECRET || '').trim();
  if (env.NODE_ENV === 'production') {
    if (!secret || secret === DEFAULT_INTERNAL_API_SECRET) {
      throw new Error('INTERNAL_API_SECRET must be set to a non-default value in production');
    }
    return secret;
  }
  return secret || DEFAULT_INTERNAL_API_SECRET;
}

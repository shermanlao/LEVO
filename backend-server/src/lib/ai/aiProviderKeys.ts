import { decryptAiSecret, encryptAiSecret } from './aiSettingsCrypto';
import {
  AI_PROVIDER_KEY_IDS,
  isAiProviderKeyId,
  type AiProviderKeyId,
  type ProviderKeyPresence,
} from './aiConstants';
import { normalizeImageAiProviderId } from './imageAiProviders';

export type EncryptedProviderKeysMap = Partial<Record<AiProviderKeyId, string>>;

export function parseEncryptedProviderKeysMap(raw: unknown): EncryptedProviderKeysMap {
  if (typeof raw === 'string') {
    try {
      return parseEncryptedProviderKeysMap(JSON.parse(raw || '{}'));
    } catch {
      return {};
    }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: EncryptedProviderKeysMap = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const id = normalizeImageAiProviderId(key);
    if (!isAiProviderKeyId(id)) continue;
    if (typeof value === 'string' && value.trim()) out[id] = value.trim();
  }
  return out;
}

export function providerKeyPresence(
  map: EncryptedProviderKeysMap,
  opts?: { envProvider?: string | null; hasEnvKey?: boolean }
): ProviderKeyPresence {
  const presence = {} as ProviderKeyPresence;
  for (const id of AI_PROVIDER_KEY_IDS) {
    presence[id] = !!map[id];
  }
  if (opts?.hasEnvKey && opts.envProvider) {
    const id = normalizeImageAiProviderId(opts.envProvider);
    if (isAiProviderKeyId(id)) presence[id] = true;
  }
  return presence;
}

export function decryptProviderKey(
  map: EncryptedProviderKeysMap,
  provider: string
): string | null {
  const id = normalizeImageAiProviderId(provider);
  if (!isAiProviderKeyId(id)) return null;
  const blob = map[id];
  if (!blob) return null;
  try {
    return decryptAiSecret(blob);
  } catch {
    return null;
  }
}

export function setEncryptedProviderKey(
  map: EncryptedProviderKeysMap,
  provider: AiProviderKeyId,
  plain: string | null | undefined
): EncryptedProviderKeysMap {
  const next = { ...map };
  const trimmed = (plain ?? '').trim();
  if (!trimmed) return next;
  if (trimmed === '********') return next;
  next[provider] = encryptAiSecret(trimmed);
  return next;
}

export function clearEncryptedProviderKey(
  map: EncryptedProviderKeysMap,
  provider: AiProviderKeyId
): EncryptedProviderKeysMap {
  const next = { ...map };
  delete next[provider];
  return next;
}

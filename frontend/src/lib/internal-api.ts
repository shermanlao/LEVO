import { INTERNAL_API_HEADER, resolveInternalApiSecret } from '@shared/production-secrets';

export function internalApiHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    ...extra,
    [INTERNAL_API_HEADER]: resolveInternalApiSecret(),
  };
}

import { createRateLimitedPublicGetProxy } from '@/lib/public-proxy';

export const { GET, HEAD, POST, PUT, PATCH, DELETE } = createRateLimitedPublicGetProxy('/api/datasheets', {
  name: 'datasheets',
  windowMs: 60 * 1000,
  max: 30,
  timeoutMs: 120000,
});

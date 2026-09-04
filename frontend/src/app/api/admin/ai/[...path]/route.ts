import { createAdminProxy } from '@/lib/admin-backend';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export const { GET, PUT, POST, DELETE } = createAdminProxy('/api/ai', {
  encodeTail: true,
  longTimeoutPattern: /generate-size-drawing|refine-size-drawing|edit-product-photo|generate-appearance-photo|generate-datasheet-label|generate-description-phrase/,
  longTimeoutMs: 300000,
});

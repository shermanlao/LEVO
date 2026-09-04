import { createAdminProxy } from '@/lib/admin-backend';

export const dynamic = 'force-dynamic';

export const { GET, PUT, POST } = createAdminProxy('/api/external-catalog', { encodeTail: true });

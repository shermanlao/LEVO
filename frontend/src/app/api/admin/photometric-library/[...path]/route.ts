import { createAdminProxy } from '@/lib/admin-backend';

export const dynamic = 'force-dynamic';

export const { GET, POST, PUT } = createAdminProxy('/api/photometric-library', { encodeTail: true });

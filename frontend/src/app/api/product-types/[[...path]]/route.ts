import { createPublicCatalogProxy } from '@/lib/admin-backend';

export const revalidate = 120;

export const { GET, HEAD, POST, PUT, PATCH, DELETE } = createPublicCatalogProxy('/api/product-types');

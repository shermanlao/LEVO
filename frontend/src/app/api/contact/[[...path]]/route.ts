import { createContactProxy } from '@/lib/public-proxy';

export const { GET, HEAD, POST, PUT, PATCH, DELETE } = createContactProxy();

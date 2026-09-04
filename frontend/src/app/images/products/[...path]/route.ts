import { NextRequest } from 'next/server';
import { servePublicDiskImage } from '@/lib/disk-image-response';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const params = await Promise.resolve(context.params);
  return servePublicDiskImage(request, ['images', 'products'], params.path || []);
}

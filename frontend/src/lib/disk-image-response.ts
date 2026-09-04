import { NextRequest, NextResponse } from 'next/server';
import { access, readFile, stat } from 'fs/promises';
import path from 'path';
import { IMAGE_CACHE_CONTROL } from '@/lib/catalog-cache';

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

function fileEtag(mtimeMs: number, size: number): string {
  return `"${Math.round(mtimeMs)}-${size}"`;
}

/**
 * Serve a file from `public/<subdir>` with ETag and a short public cache.
 * Keeps runtime-written uploads visible without restarting `next dev`.
 */
export async function servePublicDiskImage(
  request: NextRequest,
  publicSubdir: string[],
  pathParts: string[]
): Promise<NextResponse> {
  const parts = pathParts.filter(Boolean);
  if (parts.length === 0 || parts.some((p) => p === '..' || p.includes('\\') || p.includes('\0'))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const root = path.resolve(process.cwd(), 'public', ...publicSubdir);
  const target = path.resolve(root, ...parts);
  if (!target.startsWith(root + path.sep) && target !== root) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    await access(target);
    const info = await stat(target);
    if (!info.isFile()) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const etag = fileEtag(info.mtimeMs, info.size);
    const headers: Record<string, string> = {
      'Cache-Control': IMAGE_CACHE_CONTROL,
      ETag: etag,
    };

    if (request.headers.get('if-none-match') === etag) {
      return new NextResponse(null, { status: 304, headers });
    }

    const ext = path.extname(target).toLowerCase();
    const buffer = await readFile(target);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        ...headers,
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Content-Length': String(info.size),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}

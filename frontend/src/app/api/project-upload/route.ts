import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { writeFile } from 'fs/promises';
import { requireAdminSession } from '@/lib/admin-backend';

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function sanitizeSlug(raw: string): string {
  return path.basename(String(raw || '')).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
}

async function ensureDirectoryExists(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function POST(request: NextRequest) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const projectSlug = sanitizeSlug(String(formData.get('projectSlug') || ''));
    const imageType = sanitizeSlug(String(formData.get('imageType') || 'image')) || 'image';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!projectSlug) {
      return NextResponse.json({ error: 'Missing projectSlug' }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    const fileExtension = path.extname(file.name || '').toLowerCase() || '.jpg';
    if (!ALLOWED_EXT.has(fileExtension)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, and GIF images are allowed' }, { status: 400 });
    }

    const timestamp = Date.now();
    const fileName =
      imageType === 'thumbnail'
        ? `${projectSlug}-thumbnail${fileExtension}`
        : `${projectSlug}-${imageType}-${timestamp}${fileExtension}`;

    const publicDirPath = path.join(process.cwd(), 'public');
    const targetDir = path.join(publicDirPath, 'images', 'projects', projectSlug);
    const resolvedDir = path.resolve(targetDir);
    const publicImages = path.resolve(path.join(publicDirPath, 'images', 'projects'));
    if (!resolvedDir.startsWith(publicImages + path.sep) && resolvedDir !== publicImages) {
      return NextResponse.json({ error: 'Invalid project folder' }, { status: 400 });
    }

    await ensureDirectoryExists(resolvedDir);
    const targetPath = path.join(resolvedDir, fileName);
    const bytes = await file.arrayBuffer();
    await writeFile(targetPath, Buffer.from(bytes));

    const publicUrl = `/images/projects/${projectSlug}/${fileName}`;
    return NextResponse.json({ success: true, url: publicUrl, path: publicUrl });
  } catch (error) {
    console.error('Project upload failed:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

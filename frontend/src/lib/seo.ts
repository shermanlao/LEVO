import type { Metadata } from 'next';

export function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_ORIGIN || 'http://localhost:3000').replace(
    /\/$/,
    ''
  );
}

/** Strip HTML tags and collapse whitespace for meta descriptions. */
export function stripHtml(value: unknown, max = 160): string {
  const text = String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!max || text.length <= max) return text;
  const sliced = text.slice(0, max - 1);
  const lastSpace = sliced.lastIndexOf(' ');
  return `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).trim()}…`;
}

export function absoluteUrl(path: string): string {
  const origin = siteOrigin();
  if (!path || path === '/') return origin;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export function pageCanonical(path: string): Metadata['alternates'] {
  return { canonical: absoluteUrl(path) };
}

type BuildPageMetaInput = {
  title: string;
  description?: string;
  path: string;
  image?: string | null;
  noIndex?: boolean;
  /** When true, use `title` as the full document title (no template suffix). */
  absoluteTitle?: boolean;
};

export function buildPageMetadata({
  title,
  description,
  path,
  image,
  noIndex,
  absoluteTitle,
}: BuildPageMetaInput): Metadata {
  const desc = stripHtml(description || '', 160);
  const ogImage = image ? absoluteUrl(image) : undefined;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: desc || undefined,
    alternates: pageCanonical(path),
    robots: noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description: desc || undefined,
      url: absoluteUrl(path),
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: desc || undefined,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

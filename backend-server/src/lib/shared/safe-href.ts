/** Allow only http(s) URLs for hrefs stored in the database. */
export function safeHttpUrl(raw: string | null | undefined): string | null {
  const value = String(raw || '').trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch {
    return null;
  }
  return null;
}

/** Same-site path or http(s) URL for hero CTAs and similar. */
export function safePublicHref(raw: string | null | undefined): string | null {
  const value = String(raw || '').trim();
  if (!value) return null;
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('..') && !value.includes('\\')) {
    return value;
  }
  return safeHttpUrl(value);
}

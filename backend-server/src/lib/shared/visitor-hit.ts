export const VISITOR_PATH_MAX = 200;
export const VISITOR_REFERRER_MAX = 500;
export const VISITOR_QUERY_MAX = 500;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SENSITIVE_QUERY_KEY =
  /^(pass(word|wd)?|pwd|token|secret|api[_-]?key|access[_-]?token|auth|session|cookie|authorization)$/i;

export function isVisitorKey(value: string): boolean {
  return UUID_RE.test(value);
}

export function sanitizeVisitorPath(raw: string): string | null {
  let path = String(raw || '').trim();
  if (!path.startsWith('/')) path = `/${path}`;
  const q = path.indexOf('?');
  if (q >= 0) path = path.slice(0, q);
  const hash = path.indexOf('#');
  if (hash >= 0) path = path.slice(0, hash);
  if (path.length > VISITOR_PATH_MAX) path = path.slice(0, VISITOR_PATH_MAX);
  const lower = path.toLowerCase();
  if (lower.startsWith('/admin') || lower.startsWith('/api') || lower.startsWith('/_next')) {
    return null;
  }
  if (/\.(ico|png|jpe?g|gif|webp|svg|css|js|map|woff2?|ttf|txt|xml|json)$/i.test(path)) {
    return null;
  }
  return path || null;
}

export function visitorSiteHosts(origin: string): string[] {
  const hosts = new Set<string>();
  try {
    const host = new URL(String(origin || '').trim()).hostname.toLowerCase();
    if (host) {
      hosts.add(host);
      if (host.startsWith('www.')) hosts.add(host.slice(4));
      else if (host !== 'localhost' && !/^\d/.test(host) && host.includes('.')) {
        hosts.add(`www.${host}`);
      }
    }
  } catch {
    /* ignore invalid origin */
  }
  if ([...hosts].some((host) => host === 'localhost' || host === '127.0.0.1')) {
    hosts.add('localhost');
    hosts.add('127.0.0.1');
  }
  return [...hosts];
}

function cleanedSearchParams(params: URLSearchParams): string {
  const next = new URLSearchParams();
  const keys = [...new Set([...params.keys()])].sort();
  for (const key of keys) {
    if (!key || SENSITIVE_QUERY_KEY.test(key)) continue;
    for (const value of params.getAll(key)) next.append(key, value);
  }
  return next.toString();
}

export function sanitizeVisitorReferrer(raw: string, siteHosts: readonly string[]): string | null {
  const value = String(raw || '').trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    const host = parsed.hostname.toLowerCase();
    if (siteHosts.includes(host)) return null;
    parsed.hash = '';
    parsed.username = '';
    parsed.password = '';
    parsed.search = cleanedSearchParams(parsed.searchParams);
    let out = parsed.toString();
    if (out.length > VISITOR_REFERRER_MAX) out = out.slice(0, VISITOR_REFERRER_MAX);
    return out || null;
  } catch {
    return null;
  }
}

export function sanitizeVisitorQuery(raw: string): string | null {
  const value = String(raw || '')
    .trim()
    .replace(/^\?/, '');
  if (!value) return null;
  const cleaned = cleanedSearchParams(new URLSearchParams(value));
  if (!cleaned) return null;
  return cleaned.length > VISITOR_QUERY_MAX ? cleaned.slice(0, VISITOR_QUERY_MAX) : cleaned;
}

export function sanitizeVisitorCountry(raw: string): string | null {
  const value = String(raw || '')
    .trim()
    .toUpperCase();
  return /^[A-Z]{2}$/.test(value) ? value : null;
}

export function parseVisitorParamPairs(query: string | null | undefined): string[] {
  const value = String(query || '')
    .trim()
    .replace(/^\?/, '');
  if (!value) return [];
  return value
    .split('&')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseVisitorDays(raw: unknown): 7 | 30 | 90 {
  const n = Number(raw);
  if (n === 30 || n === 90) return n;
  return 7;
}

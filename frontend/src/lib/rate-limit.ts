type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function clientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip');
  if (realIp?.trim()) return realIp.trim();
  return 'local';
}

export function consumeRateLimit(
  request: Request,
  name: string,
  opts: { windowMs: number; max: number }
): { ok: true } | { ok: false; retryAfterSec: number } {
  const key = `${name}:${clientIp(request)}`;
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true };
  }
  current.count += 1;
  if (current.count > opts.max) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  return { ok: true };
}

import { Request, Response, NextFunction } from 'express';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Nginx `X-Real-IP`, otherwise the socket address. Loopback is always `127.0.0.1`. */
export function clientIp(req: Request): string {
  const realIp = req.headers['x-real-ip'];
  const raw =
    typeof realIp === 'string' && realIp.trim()
      ? realIp.trim()
      : req.ip || req.socket.remoteAddress || 'unknown';
  return normalizeClientIp(raw);
}

export function normalizeClientIp(ip: string): string {
  let value = String(ip || '').trim();
  if (value.startsWith('::ffff:')) value = value.slice('::ffff:'.length);
  if (value === '::1') return '127.0.0.1';
  return value || 'unknown';
}

export function rateLimit(options: { windowMs: number; max: number; name: string }) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${options.name}:${clientIp(req)}`;
    const now = Date.now();
    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }
    current.count += 1;
    if (current.count > options.max) {
      const retrySec = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retrySec));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    return next();
  };
}

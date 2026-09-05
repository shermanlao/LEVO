import { timingSafeEqual } from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { INTERNAL_API_HEADER, resolveInternalApiSecret } from './shared/production-secrets';

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function requireInternalSecret(req: Request, res: Response, next: NextFunction): void {
  const expected = resolveInternalApiSecret();
  const got = String(req.headers[INTERNAL_API_HEADER] || '');
  if (!got || !safeEqual(got, expected)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

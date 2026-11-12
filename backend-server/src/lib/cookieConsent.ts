import { createHash } from 'crypto';

export const COOKIE_CHOICES = ['all', 'necessary'] as const;
export type CookieChoice = (typeof COOKIE_CHOICES)[number];

export function isCookieChoice(value: unknown): value is CookieChoice {
  return value === 'all' || value === 'necessary';
}

/** SHA-256 of ADMIN_SESSION_SECRET plus the IP. The raw address is not stored. */
export function hashClientIp(ip: string): string {
  const secret = String(process.env.ADMIN_SESSION_SECRET || '');
  return createHash('sha256').update(secret + ip).digest('hex');
}

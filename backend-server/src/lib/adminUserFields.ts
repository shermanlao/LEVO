export const USERNAME_RE = /^[a-zA-Z0-9_-]{2,32}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DEFAULT_ADMIN_EMAIL = 'admin@levo.local';

export function normalizeEmail(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value);
}

export function normalizeOptionalText(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text || null;
}

export function fallbackStaffEmail(username: string): string {
  return `${String(username || '').trim().toLowerCase()}@levo.local`;
}

export function resolveSeedAdminEmail(env: NodeJS.ProcessEnv = process.env): string {
  const explicit = normalizeEmail(env.ADMIN_EMAIL);
  if (explicit) return explicit;
  return DEFAULT_ADMIN_EMAIL;
}

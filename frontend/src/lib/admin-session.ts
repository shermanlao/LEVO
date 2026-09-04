export const ADMIN_SESSION_COOKIE = 'levo_admin_session';

export type AdminRole = 'admin' | 'staff';

export type AdminSession = {
  username: string;
  role: AdminRole;
};

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

function getSessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || 'levo-dev-admin-session';
}

function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacHex(message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return toHex(sig);
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function isRole(value: string): value is AdminRole {
  return value === 'admin' || value === 'staff';
}

export async function createSessionValue(username: string, role: AdminRole): Promise<string> {
  const exp = Date.now() + SESSION_MS;
  const payload = `${encodeURIComponent(username)}.${role}.${exp}`;
  const sig = await hmacHex(payload);
  return `${payload}.${sig}`;
}

export async function verifySessionValue(value: string | undefined | null): Promise<AdminSession | null> {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 4) return null;
  const [userEnc, role, expStr, sig] = parts;
  if (!isRole(role)) return null;
  let username = '';
  try {
    username = decodeURIComponent(userEnc);
  } catch {
    return null;
  }
  if (!username) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return null;
  const expected = await hmacHex(`${userEnc}.${role}.${expStr}`);
  if (!safeEqual(sig, expected)) return null;
  return { username, role };
}

export function safeAdminNextPath(raw: string | null | undefined): string {
  if (!raw) return '/admin';
  if (raw.includes('..') || raw.includes('//') || raw.includes('\\')) return '/admin';
  if (!/^\/admin(\/[\w\/-]*)?$/.test(raw)) return '/admin';
  return raw;
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MS / 1000,
};

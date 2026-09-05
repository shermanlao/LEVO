import dns from 'dns/promises';
import net from 'net';
import { DEFAULT_LIGHTX_BASE_URL } from '../models/ExternalCatalogSource';

const BLOCKED_HOSTS = new Set(['localhost', 'metadata.google.internal']);

function ipToInt(ip: string): number | null {
  const parts = ip.split('.').map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return null;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

export function isPrivateOrLocalIp(ip: string): boolean {
  const version = net.isIP(ip);
  if (version === 4) {
    const n = ipToInt(ip);
    if (n == null) return true;
    if (ip === '0.0.0.0') return true;
    // JS bitwise ops are signed 32-bit; >>> 0 so 192.168/172.16 masks compare correctly.
    if (((n & 0xff000000) >>> 0) === 0x7f000000) return true; // 127.0.0.0/8
    if (((n & 0xff000000) >>> 0) === 0x0a000000) return true; // 10.0.0.0/8
    if (((n & 0xfff00000) >>> 0) === 0xac100000) return true; // 172.16.0.0/12
    if (((n & 0xffff0000) >>> 0) === 0xc0a80000) return true; // 192.168.0.0/16
    if (((n & 0xffff0000) >>> 0) === 0xa9fe0000) return true; // 169.254.0.0/16
    return false;
  }
  if (version === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) return true;
    if (lower.startsWith('::ffff:')) {
      const mapped = lower.slice('::ffff:'.length);
      if (net.isIP(mapped) === 4) return isPrivateOrLocalIp(mapped);
    }
    return false;
  }
  return true;
}

export function defaultPartnerHostname(): string {
  try {
    return new URL(DEFAULT_LIGHTX_BASE_URL).hostname.toLowerCase();
  } catch {
    return 'lightx.synology.me';
  }
}

export function assertSafeHttpUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw Object.assign(new Error('Invalid URL'), { status: 400 });
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw Object.assign(new Error('Only http and https URLs are allowed'), { status: 400 });
  }
  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.localhost')) {
    throw Object.assign(new Error('That host is not allowed'), { status: 400 });
  }
  if (net.isIP(host) && isPrivateOrLocalIp(host)) {
    throw Object.assign(new Error('That host is not allowed'), { status: 400 });
  }
  return parsed;
}

export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  const parsed = assertSafeHttpUrl(raw);
  if (net.isIP(parsed.hostname)) {
    if (isPrivateOrLocalIp(parsed.hostname)) {
      throw Object.assign(new Error('That host is not allowed'), { status: 400 });
    }
    return parsed;
  }
  let lookup: Array<{ address: string }>;
  try {
    lookup = await dns.lookup(parsed.hostname, { all: true });
  } catch {
    throw Object.assign(new Error('Could not resolve host'), { status: 400 });
  }
  if (!lookup.length || lookup.some((row) => isPrivateOrLocalIp(row.address))) {
    throw Object.assign(new Error('That host is not allowed'), { status: 400 });
  }
  return parsed;
}

export function isPartnerHost(hostname: string, partnerBaseUrl: string): boolean {
  const host = hostname.toLowerCase();
  const allowed = new Set<string>([defaultPartnerHostname()]);
  try {
    allowed.add(new URL(partnerBaseUrl).hostname.toLowerCase());
  } catch {
    /* ignore */
  }
  return allowed.has(host);
}

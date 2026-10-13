type GeoLookup = (ip: string) => { country?: string } | null;

let lookup: GeoLookup | null = null;
let loaded = false;

function loadLookup(): GeoLookup | null {
  if (loaded) return lookup;
  loaded = true;
  try {
    // geoip-country is CommonJS with on-disk data files; keep it out of the client bundle.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const geoip = require('geoip-country') as { lookup?: GeoLookup };
    lookup = typeof geoip.lookup === 'function' ? geoip.lookup.bind(geoip) : null;
  } catch {
    lookup = null;
  }
  return lookup;
}

function firstClientIp(raw: string | null | undefined): string | null {
  const value = String(raw || '')
    .split(',')[0]
    .trim();
  if (!value) return null;
  if (value.startsWith('::ffff:')) return value.slice(7);
  return value;
}

export function countryFromRequestIp(raw: string | null | undefined): string | null {
  const ip = firstClientIp(raw);
  if (!ip) return null;
  const fn = loadLookup();
  if (!fn) return null;
  try {
    const geo = fn(ip);
    const country = String(geo?.country || '')
      .trim()
      .toUpperCase();
    return /^[A-Z]{2}$/.test(country) ? country : null;
  } catch {
    return null;
  }
}

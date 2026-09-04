/** Visual encodings for catalog spec values (CCT swatch, beam cone, finish swatch). */

const CCT_STOPS: Array<{ k: number; hex: string }> = [
  { k: 1800, hex: '#e08a2e' },
  { k: 2200, hex: '#efb04a' },
  { k: 2700, hex: '#f2cc7a' },
  { k: 3000, hex: '#f0dca6' },
  { k: 3500, hex: '#eee8d4' },
  { k: 4000, hex: '#e8ebe4' },
  { k: 4500, hex: '#e2e8ee' },
  { k: 5000, hex: '#d9e4f2' },
  { k: 6500, hex: '#c9daf0' },
];

const FINISH_COLORS: Array<{ test: RegExp; color: string }> = [
  { test: /\bblack\b|\bbk\b|ral\s*9005/i, color: '#1a1a1a' },
  { test: /\bwhite\b|\bwh\b|ral\s*9016|ral\s*9003/i, color: '#ffffff' },
  { test: /\bsilver\b|\balumin/i, color: '#c5c9ce' },
  { test: /\bgold\b|\bbrass\b/i, color: '#c9a227' },
  { test: /\bchrome\b/i, color: '#d8dce0' },
  { test: /\bbronze\b/i, color: '#8c6239' },
  { test: /\bnickel\b/i, color: '#b8b8b0' },
  { test: /\bcopper\b/i, color: '#b87333' },
  { test: /\bgrey\b|\bgray\b/i, color: '#9ca3af' },
];

function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function hexToRgb(hex: string): [number, number, number] {
  const raw = hex.replace('#', '');
  const n = parseInt(raw.length === 3 ? raw.replace(/./g, (c) => c + c) : raw, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const to = (channel: number) => Math.round(Math.min(255, Math.max(0, channel))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

function mixHex(left: string, right: string, t: number): string {
  const a = hexToRgb(left);
  const b = hexToRgb(right);
  const p = clamp01(t);
  return rgbToHex(a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[2] + (b[2] - a[2]) * p);
}

export function parseKelvinList(value: unknown): number[] {
  const text = String(value ?? '').trim();
  if (!text) return [];
  const matches = text.match(/(\d{3,5})\s*k\b/gi);
  if (matches) {
    return matches
      .map((part) => parseInt(part, 10))
      .filter((kelvin) => Number.isFinite(kelvin) && kelvin >= 1000 && kelvin <= 20000);
  }
  const n = parseFloat(text.replace(/[^\d.]/g, ''));
  if (Number.isFinite(n) && n >= 1000 && n <= 20000) return [n];
  return [];
}

export function cctSwatchHex(kelvin: number): string {
  const k = Math.min(6500, Math.max(1800, kelvin));
  let lower = CCT_STOPS[0];
  let upper = CCT_STOPS[CCT_STOPS.length - 1];
  for (let i = 0; i < CCT_STOPS.length - 1; i += 1) {
    if (k >= CCT_STOPS[i].k && k <= CCT_STOPS[i + 1].k) {
      lower = CCT_STOPS[i];
      upper = CCT_STOPS[i + 1];
      break;
    }
  }
  if (upper.k === lower.k) return lower.hex;
  return mixHex(lower.hex, upper.hex, (k - lower.k) / (upper.k - lower.k));
}

export function cctSwatchColors(value: unknown): string[] {
  return parseKelvinList(value).map(cctSwatchHex);
}

export function finishSwatchColors(value: unknown): string[] {
  const text = String(value ?? '').trim();
  if (!text) return [];
  const parts = text.split(/[/+,|]+/).map((part) => part.trim()).filter(Boolean);
  const colors = parts
    .map((part) => FINISH_COLORS.find((row) => row.test.test(part))?.color)
    .filter((color): color is string => Boolean(color));
  if (colors.length) return [...new Set(colors)];
  if (FINISH_COLORS.some((row) => row.test.test(text))) {
    return [FINISH_COLORS.find((row) => row.test.test(text))!.color];
  }
  return [];
}

export function parseBeamDegrees(value: unknown): number | null {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const nums = [...text.matchAll(/(\d+(?:\.\d+)?)/g)]
    .map((match) => parseFloat(match[1]))
    .filter((n) => Number.isFinite(n) && n > 0 && n <= 180);
  if (!nums.length) return null;
  return Math.max(...nums);
}

export function formatBeamLabel(value: unknown): string {
  const text = String(value ?? '').trim();
  if (!text) return '';
  return /°|deg/i.test(text) ? text : `${text}°`;
}

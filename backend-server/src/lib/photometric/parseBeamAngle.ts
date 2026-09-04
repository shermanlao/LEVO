/** Circular beam keys stored in the LDT template library. */
export const CIRCULAR_BEAM_DEGREES = [
  8, 10, 12, 15, 20, 24, 30, 36, 40, 45, 50, 60, 80, 90, 100, 110, 120, 140, 160, 180,
] as const;

export type CircularBeamDegrees = (typeof CIRCULAR_BEAM_DEGREES)[number];

export function isCircularBeamDegrees(value: number): value is CircularBeamDegrees {
  return (CIRCULAR_BEAM_DEGREES as readonly number[]).includes(value);
}

/** First numeric token in a spec string (`1800 lm` → 1800). */
export function parseFirstNumber(input: string | number | null | undefined): number | null {
  if (input == null) return null;
  const m = String(input).match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

export type ParsedBeamAngle = {
  degrees: number | null;
  isDual: boolean;
  raw: string;
};

/**
 * Parse catalog beam_angle. Dual values like `15/24` or `15°+24°` set isDual.
 * The first number is still returned for nearest-key recommend.
 */
export function parseBeamAngle(input: string | null | undefined): ParsedBeamAngle {
  const raw = input == null ? '' : String(input).trim();
  if (!raw) return { degrees: null, isDual: false, raw };

  const numbers = [...raw.matchAll(/-?\d+(\.\d+)?/g)]
    .map((m) => parseFloat(m[0]))
    .filter((n) => Number.isFinite(n));

  const isDual =
    numbers.length >= 2 && /[/+&]|x|×/i.test(raw.replace(/^\s*[øØφΦ]|dia(meter)?/i, ''));

  return {
    degrees: numbers.length > 0 ? numbers[0] : null,
    isDual,
    raw,
  };
}

/** Linear / LED-strip keys (10°–90° narrow + wide diffuse covers). */
export const LINEAR_BEAM_DEGREES = [
  10, 12, 15, 20, 24, 30, 36, 40, 45, 50, 60, 80, 90, 120, 140, 160, 180,
] as const;

export type LinearBeamDegrees = (typeof LINEAR_BEAM_DEGREES)[number];

export function isLinearBeamDegrees(value: number): value is LinearBeamDegrees {
  return (LINEAR_BEAM_DEGREES as readonly number[]).includes(value);
}

export function nearestBeamInKeys<T extends number>(degrees: number, keys: readonly T[]): T {
  let best = keys[0];
  let bestDist = Math.abs(degrees - best);
  for (const key of keys) {
    const d = Math.abs(degrees - key);
    if (d < bestDist) {
      best = key;
      bestDist = d;
    }
  }
  return best;
}

export function nearestCircularBeam(degrees: number): CircularBeamDegrees {
  return nearestBeamInKeys(degrees, CIRCULAR_BEAM_DEGREES);
}

export function nearestLinearBeam(degrees: number): LinearBeamDegrees {
  return nearestBeamInKeys(degrees, LINEAR_BEAM_DEGREES);
}

export type BeamRecommendKind = 'exact' | 'nearest' | 'dual' | 'empty';

export type BeamRecommendation = {
  beamDegrees: number;
  kind: BeamRecommendKind;
  parsedDegrees: number | null;
  message: string;
};

export function recommendLibraryBeam(
  input: string | null | undefined,
  keys: readonly number[],
  emptyDefault: number,
  emptyLabel: string
): BeamRecommendation {
  const parsed = parseBeamAngle(input);
  if (parsed.degrees == null) {
    return {
      beamDegrees: emptyDefault,
      kind: 'empty',
      parsedDegrees: null,
      message: `No beam on this product — pick a library ${emptyLabel} (default ${emptyDefault}°).`,
    };
  }

  const nearest = nearestBeamInKeys(parsed.degrees, keys);
  if (parsed.isDual) {
    return {
      beamDegrees: nearest,
      kind: 'dual',
      parsedDegrees: parsed.degrees,
      message: `Product beam is ${parsed.raw} — pick the ${emptyLabel} to use (suggested ${nearest}°).`,
    };
  }
  if (nearest === parsed.degrees || Math.abs(nearest - parsed.degrees) < 0.01) {
    return {
      beamDegrees: nearest,
      kind: 'exact',
      parsedDegrees: parsed.degrees,
      message: `Recommended: ${nearest}°.`,
    };
  }
  return {
    beamDegrees: nearest,
    kind: 'nearest',
    parsedDegrees: parsed.degrees,
    message: `Nearest to ${formatDegrees(parsed.degrees)}: ${nearest}°.`,
  };
}

export function recommendCircularBeam(input: string | null | undefined): BeamRecommendation {
  return recommendLibraryBeam(input, CIRCULAR_BEAM_DEGREES, 24, 'cone');
}

export function recommendLinearBeam(input: string | null | undefined): BeamRecommendation {
  return recommendLibraryBeam(input, LINEAR_BEAM_DEGREES, 120, 'linear sample');
}

function formatDegrees(n: number): string {
  return `${n}°`;
}

import type { EulumdatDocument } from './eulumdat';

export type PolarPlaneCurves = {
  /** Intensities for C0–C180 (left/right of nadir at gamma). */
  c0: number[];
  /** Intensities for C90–C270. */
  c90: number[];
  gammaAngles: number[];
  lorl: number;
};

/**
 * Pick C0 and C90 intensity planes for polar plotting.
 * Isym=1: one plane used for both legends.
 * Isym=2/3: stored planes are C=0 … C=180; C90 is at 90/dc index when present.
 */
export function selectPolarPlanes(doc: EulumdatDocument): PolarPlaneCurves {
  const gammaAngles = [...doc.gammaAngles];
  const empty = gammaAngles.map(() => 0);
  const plane0 = doc.intensities[0] ? [...doc.intensities[0]] : empty;

  if (doc.isym === 1 || doc.intensities.length === 1) {
    return { c0: plane0, c90: [...plane0], gammaAngles, lorl: doc.lorl };
  }

  let c90Index = 0;
  if (doc.dc > 0) {
    const want = 90;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < doc.cAngles.length && i < doc.intensities.length; i++) {
      const dist = Math.abs(doc.cAngles[i] - want);
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    c90Index = best;
  } else {
    c90Index = Math.min(Math.floor(doc.intensities.length / 2), doc.intensities.length - 1);
  }

  const c90 = doc.intensities[c90Index] ? [...doc.intensities[c90Index]] : [...plane0];
  return { c0: plane0, c90, gammaAngles, lorl: doc.lorl };
}

export function nicePolarScaleMax(peak: number): number {
  if (!(peak > 0) || !Number.isFinite(peak)) return 100;
  const exp = Math.floor(Math.log10(peak));
  const base = Math.pow(10, exp);
  const n = peak / base;
  let nice: number;
  if (n <= 1) nice = 1;
  else if (n <= 1.5) nice = 1.5;
  else if (n <= 2) nice = 2;
  else if (n <= 3) nice = 3;
  else if (n <= 4) nice = 4;
  else if (n <= 5) nice = 5;
  else nice = 10;
  return nice * base;
}

export function photometricPolarPeak(
  doc: EulumdatDocument,
  unit: 'cd/klm' | 'cd' = 'cd'
): number {
  const planes = selectPolarPlanes(doc);
  const flux = lampFlux(doc);
  const useCd = unit === 'cd' && flux != null;
  const factor = useCd ? flux / 1000 : 1;
  let peak = 0;
  for (const v of planes.c0) peak = Math.max(peak, v * factor);
  for (const v of planes.c90) peak = Math.max(peak, v * factor);
  return peak;
}

/** One ring scale per group (family datasheet: one scale per beam so wattages compare). */
export function sharedPolarScaleByGroup(
  items: Array<{ group: string; peak: number }>
): Map<string, number> {
  const maxPeak = new Map<string, number>();
  for (const item of items) {
    maxPeak.set(item.group, Math.max(maxPeak.get(item.group) || 0, item.peak));
  }
  const scales = new Map<string, number>();
  for (const [group, peak] of maxPeak) {
    scales.set(group, nicePolarScaleMax(peak));
  }
  return scales;
}

function polarToXy(
  cx: number,
  cy: number,
  radius: number,
  scaleMax: number,
  gammaDeg: number,
  intensity: number,
  side: 'left' | 'right'
): { x: number; y: number } {
  const r = scaleMax > 0 ? (Math.max(0, intensity) / scaleMax) * radius : 0;
  const theta = (gammaDeg * Math.PI) / 180;
  const xOff = r * Math.sin(theta);
  const y = cy + r * Math.cos(theta);
  return { x: side === 'right' ? cx + xOff : cx - xOff, y };
}

function curvePath(
  cx: number,
  cy: number,
  radius: number,
  scaleMax: number,
  gammaAngles: number[],
  intensities: number[]
): string {
  const pts: string[] = [];
  for (let i = 0; i < gammaAngles.length; i++) {
    const g = gammaAngles[i];
    if (g > 105) continue;
    const { x, y } = polarToXy(cx, cy, radius, scaleMax, g, intensities[i] ?? 0, 'right');
    pts.push(`${pts.length === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  for (let i = gammaAngles.length - 1; i >= 0; i--) {
    const g = gammaAngles[i];
    if (g > 105) continue;
    const { x, y } = polarToXy(cx, cy, radius, scaleMax, g, intensities[i] ?? 0, 'left');
    pts.push(`L${x.toFixed(2)},${y.toFixed(2)}`);
  }
  if (pts.length === 0) return '';
  return `${pts.join(' ')} Z`;
}

export type RenderPhotometricPolarOptions = {
  width?: number;
  height?: number;
  /** `cd` multiplies library cd/klm by lamp flux/1000. LDT files stay cd/klm. */
  unit?: 'cd/klm' | 'cd';
  /** Fixed ring max (cd or cd/klm). When omitted, each plot auto-scales to its own peak. */
  scaleMax?: number;
};

function lampFlux(doc: EulumdatDocument): number | null {
  const flux = doc.lamps?.[0]?.flux;
  if (flux == null || !Number.isFinite(Number(flux)) || Number(flux) <= 0) return null;
  return Number(flux);
}

function scaleIntensities(values: number[], factor: number): number[] {
  if (factor === 1) return values;
  return values.map((v) => v * factor);
}

/**
 * Build an LDT-Editor-style polar diagram SVG from an EULUMDAT document.
 */
export function renderPhotometricPolarSvg(
  doc: EulumdatDocument,
  opts?: RenderPhotometricPolarOptions
): string {
  const width = opts?.width ?? 520;
  const height = opts?.height ?? 420;
  const planes = selectPolarPlanes(doc);
  const flux = lampFlux(doc);
  const useCd = opts?.unit === 'cd' && flux != null;
  const factor = useCd ? flux / 1000 : 1;
  const unitLabel = useCd ? 'cd' : 'cd/klm';
  const c0 = scaleIntensities(planes.c0, factor);
  const c90 = scaleIntensities(planes.c90, factor);
  const gammaAngles = planes.gammaAngles;
  const lorl = planes.lorl;

  let peak = 0;
  for (const v of c0) peak = Math.max(peak, v);
  for (const v of c90) peak = Math.max(peak, v);
  const scaleMax =
    opts?.scaleMax != null && opts.scaleMax > 0 ? opts.scaleMax : nicePolarScaleMax(peak);

  const cx = width / 2;
  const cy = height * 0.42;
  const radius = Math.min(width, height) * 0.38;
  const ringCount = 4;
  const angleMarks = [0, 15, 30, 45, 60, 75, 90, 105];

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
  );
  parts.push(`<rect width="100%" height="100%" fill="#ffffff"/>`);

  for (let i = 1; i <= ringCount; i++) {
    const r = (radius * i) / ringCount;
    parts.push(
      `<path d="M ${(cx - r).toFixed(2)},${cy.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 0 ${(cx + r).toFixed(2)},${cy.toFixed(2)}" fill="none" stroke="#c8c8c8" stroke-width="1"/>`
    );
  }

  for (const a of angleMarks) {
    const { x: xr, y: yr } = polarToXy(cx, cy, radius, scaleMax, a, scaleMax, 'right');
    const { x: xl, y: yl } = polarToXy(cx, cy, radius, scaleMax, a, scaleMax, 'left');
    parts.push(
      `<line x1="${cx}" y1="${cy}" x2="${xr.toFixed(2)}" y2="${yr.toFixed(2)}" stroke="#d0d0d0" stroke-width="1"/>`
    );
    if (a !== 0) {
      parts.push(
        `<line x1="${cx}" y1="${cy}" x2="${xl.toFixed(2)}" y2="${yl.toFixed(2)}" stroke="#d0d0d0" stroke-width="1"/>`
      );
    }
  }

  for (const a of angleMarks) {
    const labelR = radius + 18;
    const { x: xr, y: yr } = polarToXy(cx, cy, labelR, scaleMax, a, scaleMax, 'right');
    const { x: xl, y: yl } = polarToXy(cx, cy, labelR, scaleMax, a, scaleMax, 'left');
    parts.push(
      `<text x="${xr.toFixed(2)}" y="${yr.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="11" fill="#333">${a}°</text>`
    );
    if (a !== 0) {
      parts.push(
        `<text x="${xl.toFixed(2)}" y="${yl.toFixed(2)}" text-anchor="middle" dominant-baseline="middle" font-family="Arial,sans-serif" font-size="11" fill="#333">${a}°</text>`
      );
    }
  }

  for (let i = 1; i <= ringCount; i++) {
    const val = (scaleMax * i) / ringCount;
    const y = cy + (radius * i) / ringCount;
    const label = Number.isInteger(val) ? String(val) : val.toFixed(0);
    parts.push(
      `<text x="${(cx + 6).toFixed(2)}" y="${y.toFixed(2)}" font-family="Arial,sans-serif" font-size="11" fill="#333">${label}</text>`
    );
  }

  const pathC0 = curvePath(cx, cy, radius, scaleMax, gammaAngles, c0);
  const pathC90 = curvePath(cx, cy, radius, scaleMax, gammaAngles, c90);

  if (pathC0) {
    parts.push(`<path d="${pathC0}" fill="#fff6c8" fill-opacity="0.85" stroke="none"/>`);
  }
  if (pathC0) {
    parts.push(`<path d="${pathC0}" fill="none" stroke="#c62828" stroke-width="1.5"/>`);
  }
  if (pathC90) {
    parts.push(`<path d="${pathC90}" fill="none" stroke="#3949ab" stroke-width="1.5"/>`);
  }

  const legendY = height - 28;
  parts.push(
    `<text x="16" y="${legendY}" font-family="Arial,sans-serif" font-size="12" fill="#333">${unitLabel}</text>`
  );
  parts.push(`<line x1="80" y1="${legendY - 4}" x2="110" y2="${legendY - 4}" stroke="#c62828" stroke-width="2"/>`);
  parts.push(
    `<text x="116" y="${legendY}" font-family="Arial,sans-serif" font-size="12" fill="#333">C0 - C180</text>`
  );
  parts.push(`<line x1="210" y1="${legendY - 4}" x2="240" y2="${legendY - 4}" stroke="#3949ab" stroke-width="2"/>`);
  parts.push(
    `<text x="246" y="${legendY}" font-family="Arial,sans-serif" font-size="12" fill="#333">C90 - C270</text>`
  );
  const eta = Number.isFinite(lorl) ? Math.round(lorl) : 100;
  parts.push(
    `<text x="${width - 16}" y="${legendY}" text-anchor="end" font-family="Arial,sans-serif" font-size="12" fill="#333">η = ${eta}%</text>`
  );

  parts.push('</svg>');
  return parts.join('');
}

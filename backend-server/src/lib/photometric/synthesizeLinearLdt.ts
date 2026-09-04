import { emptyDirectRatios, writeEulumdat, type EulumdatDocument } from './eulumdat';
import type { LinearBeamDegrees } from './parseBeamAngle';

const C_STEP = 15;
/** Mc for 0…360° (Stockmar / DIALux usual interior grid). */
const MC = 360 / C_STEP;
const GAMMA_STEP = 5;

/** 1 m LED-strip sample box used when the product has no rectangular size. */
export const LINEAR_SAMPLE_SIZE_MM = {
  length: 1000,
  width: 12,
  height: 8,
  luminousWidth: 10,
} as const;

function beamExponent(fwhmDeg: number): number {
  if (fwhmDeg >= 170) return 1;
  const half = (fwhmDeg / 2) * (Math.PI / 180);
  const c = Math.cos(half);
  if (c <= 1e-6 || c >= 1) return 1;
  return Math.log(0.5) / Math.log(c);
}

function relativeIntensity(gammaDeg: number, n: number): number {
  if (gammaDeg >= 90) return 0;
  const c = Math.cos(gammaDeg * (Math.PI / 180));
  if (c <= 0) return 0;
  return Math.pow(c, n);
}

function integrateFlux(gamma: number[], intensity: number[]): number {
  let sum = 0;
  for (let i = 0; i < gamma.length - 1; i++) {
    const g0 = gamma[i] * (Math.PI / 180);
    const g1 = gamma[i + 1] * (Math.PI / 180);
    const i0 = intensity[i] * Math.sin(g0);
    const i1 = intensity[i + 1] * Math.sin(g1);
    sum += ((i0 + i1) / 2) * (g1 - g0);
  }
  return 2 * Math.PI * sum;
}

export function buildLinearBeamDocument(beamDegrees: LinearBeamDegrees): EulumdatDocument {
  const n = beamExponent(beamDegrees);
  const gammaAngles: number[] = [];
  for (let g = 0; g <= 180; g += GAMMA_STEP) gammaAngles.push(g);

  const rel = gammaAngles.map((g) => relativeIntensity(g, n));
  const fluxRel = integrateFlux(gammaAngles, rel);
  const scale = fluxRel > 0 ? 1000 / fluxRel : 0;
  const curve = rel.map((v) => v * scale);

  // Isym=2 (C0–C180): list all Mc C-angles; store Mc/2+1 intensity planes (0…180).
  const cAngles: number[] = [];
  for (let c = 0; c < 360; c += C_STEP) cAngles.push(c);
  const storedPlanes = Math.floor(MC / 2) + 1;
  const intensities = Array.from({ length: storedPlanes }, () => [...curve]);
  const pad = String(beamDegrees).padStart(3, '0');

  return {
    company: 'LEVO',
    ityp: 2,
    isym: 2,
    mc: MC,
    dc: C_STEP,
    ng: gammaAngles.length,
    dg: GAMMA_STEP,
    report: `CALCULATED LINEAR-${pad}`,
    luminaireName: `LINEAR-${pad}`,
    luminaireNumber: 'TEMPLATE',
    fileName: `beam-${pad}.ldt`,
    dateUser: 'LEVO calculated',
    luminaireLength: LINEAR_SAMPLE_SIZE_MM.length,
    luminaireWidth: LINEAR_SAMPLE_SIZE_MM.width,
    luminaireHeight: LINEAR_SAMPLE_SIZE_MM.height,
    luminousLength: LINEAR_SAMPLE_SIZE_MM.length,
    luminousWidth: LINEAR_SAMPLE_SIZE_MM.luminousWidth,
    luminousHeightC0: 0,
    luminousHeightC90: 0,
    luminousHeightC180: 0,
    luminousHeightC270: 0,
    dff: 100,
    lorl: 100,
    conversion: 1,
    tilt: 0,
    lamps: [
      {
        lampCount: 1,
        lampType: 'LED',
        flux: 1000,
        colorTemperature: '4000',
        cri: '90',
        wattage: 10,
      },
    ],
    directRatios: emptyDirectRatios(),
    cAngles,
    gammaAngles,
    intensities,
  };
}

export function synthesizeLinearLdt(beamDegrees: LinearBeamDegrees): string {
  return writeEulumdat(buildLinearBeamDocument(beamDegrees));
}

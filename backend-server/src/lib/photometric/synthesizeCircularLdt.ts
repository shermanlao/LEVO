import { emptyDirectRatios, writeEulumdat, type EulumdatDocument } from './eulumdat';
import type { CircularBeamDegrees } from './parseBeamAngle';

const C_STEP = 15;
/** Mc for 0…360° (Stockmar / DIALux usual interior grid). */
const MC = 360 / C_STEP;
const GAMMA_STEP = 5;

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

/** Integrate rotationally symmetric I(γ) to lumens (I in cd). */
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

export function buildCircularBeamDocument(beamDegrees: CircularBeamDegrees): EulumdatDocument {
  const n = beamExponent(beamDegrees);
  const gammaAngles: number[] = [];
  for (let g = 0; g <= 180; g += GAMMA_STEP) gammaAngles.push(g);

  const rel = gammaAngles.map((g) => relativeIntensity(g, n));
  const fluxRel = integrateFlux(gammaAngles, rel);
  const scale = fluxRel > 0 ? 1000 / fluxRel : 0;
  const curve = rel.map((v) => v * scale);

  // Isym=1 (vertical-axis): list all Mc C-angles, store only one intensity plane.
  const cAngles: number[] = [];
  for (let c = 0; c < 360; c += C_STEP) cAngles.push(c);

  const pad = String(beamDegrees).padStart(3, '0');

  return {
    company: 'LEVO',
    ityp: 1,
    isym: 1,
    mc: MC,
    dc: C_STEP,
    ng: gammaAngles.length,
    dg: GAMMA_STEP,
    report: `CALCULATED BEAM-${pad}`,
    luminaireName: `BEAM-${pad}`,
    luminaireNumber: 'TEMPLATE',
    fileName: `beam-${pad}.ldt`,
    dateUser: 'LEVO calculated',
    luminaireLength: 0,
    luminaireWidth: 0,
    luminaireHeight: 0,
    luminousLength: 0,
    luminousWidth: 0,
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
    intensities: [[...curve]],
  };
}

export function synthesizeCircularLdt(beamDegrees: CircularBeamDegrees): string {
  return writeEulumdat(buildCircularBeamDocument(beamDegrees));
}

import {
  isLibraryBeamDegrees,
  isPhotometricFamily,
  recommendPhotometricFamily,
  type PhotometricFamily,
} from './beamLibrary';
import { recommendCircularBeam, recommendLinearBeam } from './parseBeamAngle';
import type { LdtStampProduct } from './stampLdtFromProduct';

type Stamp = LdtStampProduct & { beam_angle?: string | null };

export type ProductLdtChoice = {
  family: PhotometricFamily;
  beamDegrees: number;
  saved: boolean;
  familyMessage: string;
  beamMessage: string;
};

export function parseSavedLdtChoice(
  product: Record<string, unknown>
): { family: PhotometricFamily; beamDegrees: number } | null {
  const familyRaw = String(product.ldt_family || '').trim();
  const beamDegrees = Number(product.ldt_beam_degrees);
  if (!isPhotometricFamily(familyRaw)) return null;
  if (!Number.isInteger(beamDegrees) || !isLibraryBeamDegrees(familyRaw, beamDegrees)) return null;
  return { family: familyRaw, beamDegrees };
}

function beamForFamily(family: PhotometricFamily, beamAngle: string | null | undefined) {
  return family === 'linear' ? recommendLinearBeam(beamAngle) : recommendCircularBeam(beamAngle);
}

/**
 * Series combinations: series `ldt_family` (if set) plus the selected `beam_angle`.
 * Never uses a size-pack `ldt_beam_degrees` — those belong to one saved SKU polar.
 */
export function resolveVariantLdtChoice(product: Record<string, unknown>, stamp: Stamp): ProductLdtChoice {
  const familyRaw = String(product.ldt_family || '').trim();
  const familyRec = recommendPhotometricFamily(stamp);
  const family = isPhotometricFamily(familyRaw) ? familyRaw : familyRec.family;
  const beamRec = beamForFamily(family, stamp.beam_angle);
  return {
    family,
    beamDegrees: beamRec.beamDegrees,
    saved: false,
    familyMessage: isPhotometricFamily(familyRaw)
      ? `Series shape: ${family}. Beam from selected variant.`
      : familyRec.message,
    beamMessage: beamRec.message,
  };
}

/** Saved admin Shape / Library beam, or the spec-based recommendation. */
export function resolveProductLdtChoice(
  product: Record<string, unknown>,
  stamp: Stamp
): ProductLdtChoice {
  const saved = parseSavedLdtChoice(product);
  if (saved) {
    return {
      family: saved.family,
      beamDegrees: saved.beamDegrees,
      saved: true,
      familyMessage: `Saved ${saved.family} ${saved.beamDegrees}° for catalog LDT and polar image.`,
      beamMessage: `Saved library beam: ${saved.beamDegrees}°.`,
    };
  }
  return resolveVariantLdtChoice(product, stamp);
}

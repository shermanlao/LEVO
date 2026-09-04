import {
  recommendPhotometricFamily,
  type PhotometricFamily,
} from './beamLibrary';
import { getBeamTemplate, readBeamTemplateText } from './beamLibraryServer';
import {
  recommendCircularBeam,
  recommendLinearBeam,
} from './parseBeamAngle';
import {
  stampLdtTextFromProduct,
  type LdtStampProduct,
} from './stampLdtFromProduct';

export type LdtProductInput = LdtStampProduct & { beam_angle?: string | null };

export function resolveAutoLdtFamilyAndBeam(product: LdtProductInput): {
  family: PhotometricFamily;
  beamDegrees: number;
} {
  const family = recommendPhotometricFamily(product).family;
  const beamDegrees =
    family === 'linear'
      ? recommendLinearBeam(product.beam_angle).beamDegrees
      : recommendCircularBeam(product.beam_angle).beamDegrees;
  return { family, beamDegrees };
}

export async function generateStampedLdtText(
  product: LdtProductInput,
  opts?: { family?: PhotometricFamily; beamDegrees?: number }
): Promise<{ text: string; family: PhotometricFamily; beamDegrees: number }> {
  const auto = resolveAutoLdtFamilyAndBeam(product);
  const family = opts?.family ?? auto.family;
  const beamDegrees = opts?.beamDegrees ?? auto.beamDegrees;

  const template = await getBeamTemplate(family, beamDegrees);
  const raw = readBeamTemplateText(
    String(template.get('filePath')),
    family,
    beamDegrees
  );
  const text = stampLdtTextFromProduct(raw, product, family);
  return { text, family, beamDegrees };
}

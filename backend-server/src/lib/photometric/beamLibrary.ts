import { parseProductSizeMm } from './parseProductSizeMm';
import {
  CIRCULAR_BEAM_DEGREES,
  LINEAR_BEAM_DEGREES,
  type CircularBeamDegrees,
  type LinearBeamDegrees,
} from './parseBeamAngle';

export const PHOTOMETRIC_FAMILIES = ['circular', 'linear'] as const;
export type PhotometricFamily = (typeof PHOTOMETRIC_FAMILIES)[number];

export function isPhotometricFamily(value: string): value is PhotometricFamily {
  return (PHOTOMETRIC_FAMILIES as readonly string[]).includes(value);
}

export function libraryBeamsForFamily(family: PhotometricFamily): readonly number[] {
  return family === 'linear' ? LINEAR_BEAM_DEGREES : CIRCULAR_BEAM_DEGREES;
}

export function isLibraryBeamDegrees(family: PhotometricFamily, value: number): boolean {
  return (libraryBeamsForFamily(family) as readonly number[]).includes(value);
}

export function beamTemplateFileName(beamDegrees: number): string {
  return `beam-${String(beamDegrees).padStart(3, '0')}.ldt`;
}

export function beamTemplatePublicPath(family: PhotometricFamily, beamDegrees: number): string {
  return `/uploads/photometric-library/${family}/${beamTemplateFileName(beamDegrees)}`;
}

export function beamTemplateRelativeDir(family: PhotometricFamily): string[] {
  return ['uploads', 'photometric-library', family];
}

const LINEAR_HINT =
  /strip|tape|linear|batten|profile|extrusion|flex|ribbon|led\s*bar|led\s*tape/i;

export type FamilyRecommendProduct = {
  mounting?: string | null;
  description?: string | null;
  model?: string | null;
  article?: string | null;
  lamp?: string | null;
  size?: string | null;
};

export function recommendPhotometricFamily(product: FamilyRecommendProduct): {
  family: PhotometricFamily;
  message: string;
} {
  const blob = [product.mounting, product.description, product.model, product.article, product.lamp]
    .filter(Boolean)
    .join(' ');
  if (LINEAR_HINT.test(blob)) {
    return {
      family: 'linear',
      message: 'Product looks like a linear / LED strip — suggested linear sample (120° if beam is empty).',
    };
  }
  const size = parseProductSizeMm(product.size);
  if (size && !size.circular && size.width > 0 && size.length >= size.width * 2) {
    return {
      family: 'linear',
      message: 'Size is a long rectangle — suggested linear sample.',
    };
  }
  return {
    family: 'circular',
    message: 'Suggested circular cone (spotlight / downlight).',
  };
}

export { CIRCULAR_BEAM_DEGREES, LINEAR_BEAM_DEGREES };
export type { CircularBeamDegrees, LinearBeamDegrees };

import sharp from 'sharp';
import { parseEulumdat } from './eulumdat';
import { renderPhotometricPolarSvg } from './renderPhotometricPolar';
import { getBeamTemplate, readBeamTemplateText } from './beamLibraryServer';
import type { PhotometricFamily } from './beamLibrary';
import type { LdtProductInput } from './generateProductLdt';
import { generateStampedLdtText } from './generateProductLdt';
import { resolveProductLdtChoice, resolveVariantLdtChoice } from './productLdtChoice';

export async function svgOrLdtToPolarPng(input: {
  svg?: string;
  ldtText?: string;
  unit?: 'cd/klm' | 'cd';
  scaleMax?: number;
}): Promise<Buffer> {
  let svg = typeof input.svg === 'string' ? input.svg.trim() : '';
  if (!svg && typeof input.ldtText === 'string' && input.ldtText.trim()) {
    const doc = parseEulumdat(input.ldtText);
    svg = renderPhotometricPolarSvg(doc, { unit: input.unit, scaleMax: input.scaleMax });
  }
  if (!svg.startsWith('<svg')) {
    throw new Error('Provide svg or ldtText');
  }
  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function renderLibraryPolarPng(
  family: PhotometricFamily,
  beamDegrees: number
): Promise<Buffer> {
  const template = await getBeamTemplate(family, beamDegrees);
  const text = readBeamTemplateText(String(template.get('filePath')), family, beamDegrees);
  return svgOrLdtToPolarPng({ ldtText: text });
}

async function renderChoicePolarPng(
  stamp: LdtProductInput,
  family: PhotometricFamily,
  beamDegrees: number
): Promise<Buffer> {
  try {
    const { text } = await generateStampedLdtText(stamp, { family, beamDegrees });
    return svgOrLdtToPolarPng({ ldtText: text, unit: 'cd' });
  } catch {
    return renderLibraryPolarPng(family, beamDegrees);
  }
}

/** Polar PNG from library using saved Shape / beam, else the spec recommendation. */
export async function renderProductLibraryPolarPng(
  row: Record<string, unknown>,
  stamp: LdtProductInput
): Promise<Buffer> {
  const { family, beamDegrees } = resolveProductLdtChoice(row, stamp);
  return renderChoicePolarPng(stamp, family, beamDegrees);
}

/** Polar PNG for a series combination: series shape + selected beam / wattage / CCT / size. */
export async function renderVariantLibraryPolarPng(
  row: Record<string, unknown>,
  stamp: LdtProductInput
): Promise<Buffer> {
  const { family, beamDegrees } = resolveVariantLdtChoice(row, stamp);
  return renderChoicePolarPng(stamp, family, beamDegrees);
}

export async function stampedVariantLdtText(
  row: Record<string, unknown>,
  stamp: LdtProductInput
): Promise<string> {
  const { family, beamDegrees } = resolveVariantLdtChoice(row, stamp);
  const { text } = await generateStampedLdtText(stamp, { family, beamDegrees });
  return text;
}

export async function renderStampedLdtPolarPng(
  ldtText: string,
  opts?: { scaleMax?: number }
): Promise<Buffer> {
  return svgOrLdtToPolarPng({ ldtText, unit: 'cd', scaleMax: opts?.scaleMax });
}

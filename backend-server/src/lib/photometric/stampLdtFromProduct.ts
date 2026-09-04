import type { PhotometricFamily } from './beamLibrary';
import { parseEulumdat, writeEulumdat, type EulumdatDocument } from './eulumdat';
import { parseFirstNumber } from './parseBeamAngle';
import { formatProductSizeMm, parseProductSizeMm } from './parseProductSizeMm';
import { LINEAR_SAMPLE_SIZE_MM } from './synthesizeLinearLdt';

export type LdtStampProduct = {
  brand?: string | null;
  model?: string | null;
  article?: string | null;
  description?: string | null;
  lamp?: string | null;
  wattage?: string | number | null;
  lumen?: string | number | null;
  color_temperature?: string | null;
  cri?: string | null;
  size?: string | null;
  mounting?: string | null;
};

export type LdtStampPreview = {
  lumen: number | null;
  wattage: number | null;
  cct: string | null;
  cri: string | null;
  sizeLabel: string | null;
  sizeApplied: boolean;
  downloadName: string;
};

function parseWattageNumber(input: string | number | null | undefined): number | null {
  if (input == null) return null;
  if (typeof input === 'number') return Number.isFinite(input) ? input : null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;
  const withoutUnit = trimmed.replace(/\s*[Ww]\s*$/, '').trim();
  const m = withoutUnit.match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

function linearSampleSizeLabel(): string {
  return `L${LINEAR_SAMPLE_SIZE_MM.length} × W${LINEAR_SAMPLE_SIZE_MM.width} × H${LINEAR_SAMPLE_SIZE_MM.height} mm (linear sample)`;
}

function specToken(input: string | null | undefined): string | null {
  const n = parseFirstNumber(input);
  if (n == null) {
    const t = input == null ? '' : String(input).trim();
    return t || null;
  }
  return Number.isInteger(n) ? String(n) : String(n);
}

export function ldtDownloadName(product: LdtStampProduct): string {
  const base = (product.article || product.model || 'product')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .trim();
  return `${base || 'product'}.ldt`;
}

export function previewLdtStamp(
  product: LdtStampProduct,
  family: PhotometricFamily = 'circular'
): LdtStampPreview {
  const lumen = parseFirstNumber(product.lumen);
  const wattage = parseWattageNumber(product.wattage);
  const size = parseProductSizeMm(product.size);
  const useProductSize = size != null && (family !== 'linear' || (!size.circular && size.width > 0));
  return {
    lumen,
    wattage,
    cct: specToken(product.color_temperature),
    cri: specToken(product.cri),
    sizeLabel: useProductSize && size ? formatProductSizeMm(size) : family === 'linear' ? linearSampleSizeLabel() : null,
    sizeApplied: useProductSize || family === 'linear',
    downloadName: ldtDownloadName(product),
  };
}

export function stampEulumdatFromProduct(
  doc: EulumdatDocument,
  product: LdtStampProduct,
  family: PhotometricFamily = 'circular'
): EulumdatDocument {
  const preview = previewLdtStamp(product, family);
  if (preview.lumen == null || preview.lumen <= 0) {
    throw new Error('Lumen output is required to generate an LDT file');
  }

  const next: EulumdatDocument = {
    ...doc,
    company: (product.brand || doc.company || 'LEVO').trim(),
    luminaireName: [product.model, product.description].filter(Boolean).join(' ').trim() ||
      (product.article || doc.luminaireName),
    luminaireNumber: String(product.article || product.model || doc.luminaireNumber).trim(),
    fileName: preview.downloadName,
    dateUser: `${new Date().toISOString().slice(0, 10)} ${product.brand || 'LEVO'}`,
    lamps: doc.lamps.map((lamp, i) =>
      i === 0
        ? {
            ...lamp,
            lampType: (product.lamp || lamp.lampType || 'LED').trim(),
            flux: preview.lumen as number,
            colorTemperature: preview.cct ?? lamp.colorTemperature,
            cri: preview.cri ?? lamp.cri,
            wattage: preview.wattage ?? lamp.wattage,
          }
        : lamp
    ),
  };

  const size = parseProductSizeMm(product.size);
  const useProductSize = size != null && (family !== 'linear' || (!size.circular && size.width > 0));
  if (useProductSize && size) {
    next.luminaireLength = size.length;
    next.luminaireWidth = size.width;
    next.luminaireHeight = size.height;
    next.luminousLength = size.length;
    next.luminousWidth = size.width;
    next.luminousHeightC0 = size.height;
    next.luminousHeightC90 = size.height;
    next.luminousHeightC180 = size.height;
    next.luminousHeightC270 = size.height;
  }

  return next;
}

export function stampLdtTextFromProduct(
  ldtText: string,
  product: LdtStampProduct,
  family: PhotometricFamily = 'circular'
): string {
  return writeEulumdat(stampEulumdatFromProduct(parseEulumdat(ldtText), product, family));
}

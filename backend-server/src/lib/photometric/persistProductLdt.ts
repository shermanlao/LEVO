import Product from '../../models/Product';
import ProductSeries from '../../models/ProductSeries';
import { errorMessage } from '../errors';
import { generateStampedLdtText } from './generateProductLdt';
import { productToLdtStampWithSite } from './productToLdtStamp';
import { resolveProductLdtChoice } from './productLdtChoice';
import { previewLdtStamp } from './stampLdtFromProduct';
import { deleteProductLdtFile, writeProductLdtFile } from './writeProductLdtFile';

const PRODUCT_LDT_INCLUDE = [{ model: ProductSeries, as: 'series' }];

async function loadProductForLdt(productId: number) {
  return Product.findByPk(productId, { include: PRODUCT_LDT_INCLUDE });
}

/** Stamp the library LDT from product specs and store it on disk + `ldt_file`. */
export async function persistProductLdtFile(productId: number): Promise<string | null> {
  const product = await loadProductForLdt(productId);
  if (!product) return null;

  const row = product.get({ plain: true }) as Record<string, unknown> & {
    series?: { slug?: string };
  };
  const stamp = await productToLdtStampWithSite(row);
  const choice = resolveProductLdtChoice(row, stamp);
  const preview = previewLdtStamp(stamp, choice.family);
  const previousPath = typeof row.ldt_file === 'string' ? row.ldt_file : null;

  if (preview.lumen == null || preview.lumen <= 0) {
    if (previousPath) {
      deleteProductLdtFile(previousPath);
      await product.update({ ldt_file: null });
    }
    return null;
  }

  const { text } = await generateStampedLdtText(stamp, {
    family: choice.family,
    beamDegrees: choice.beamDegrees,
  });
  const stored = writeProductLdtFile(Number(row.id), row.series?.slug, text);
  if (previousPath && previousPath !== stored) {
    deleteProductLdtFile(previousPath);
  }
  await product.update({ ldt_file: stored });
  return stored;
}

export async function persistProductLdtFileSafe(productId: number): Promise<string | null> {
  try {
    return await persistProductLdtFile(productId);
  } catch (error) {
    console.warn(`Could not store LDT for product ${productId}:`, errorMessage(error));
    return null;
  }
}

export async function backfillMissingProductLdtFiles(): Promise<void> {
  const products = await Product.findAll({ attributes: ['id', 'ldt_file'] });
  for (const product of products) {
    const id = Number(product.get('id'));
    const stored = String(product.get('ldt_file') || '').trim();
    if (!id) continue;
    if (stored) continue;
    await persistProductLdtFileSafe(id);
  }
}

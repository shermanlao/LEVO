import sequelize from '../database';
import Product from '../models/Product';
import ProductSeries from '../models/ProductSeries';
import ProductType from '../models/ProductType';

export const LEVO_SKU_PATTERN = /^[A-Z]{2}\d{5}$/;

const PREFIX_BY_SLUG: Record<string, string> = {
  downlights: 'DL',
  'linear-lighting': 'LN',
  'track-lighting': 'TR',
  spotlights: 'SP',
};

const SINGULAR_BY_SLUG: Record<string, string> = {
  downlights: 'Downlight',
  'linear-lighting': 'Linear Light',
  'track-lighting': 'Track Light',
  spotlights: 'Spotlight',
};

const SINGULAR_BY_NAME: Record<string, string> = {
  downlights: 'Downlight',
  'linear lighting': 'Linear Light',
  'track lighting': 'Track Light',
  spotlights: 'Spotlight',
};

export function isLevoSku(value: unknown): boolean {
  return LEVO_SKU_PATTERN.test(String(value || '').trim());
}

export function productCodePrefix(slug: string | null | undefined): string {
  const key = String(slug || '').trim().toLowerCase();
  if (PREFIX_BY_SLUG[key]) return PREFIX_BY_SLUG[key];
  const letters = key.replace(/[^a-z]/g, '').slice(0, 2).toUpperCase();
  return letters.length === 2 ? letters : 'GP';
}

function formatCode(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(5, '0')}`;
}

function singularTypeLabel(typeName?: string | null, typeSlug?: string | null): string {
  const slug = String(typeSlug || '').trim().toLowerCase();
  if (slug && SINGULAR_BY_SLUG[slug]) return SINGULAR_BY_SLUG[slug];
  const name = String(typeName || '').trim().toLowerCase();
  if (name && SINGULAR_BY_NAME[name]) return SINGULAR_BY_NAME[name];
  const raw = String(typeName || typeSlug || 'Light').trim();
  return raw.replace(/s$/i, '') || 'Light';
}

export function levoDisplayName(
  typeName: string | null | undefined,
  wattage: number | string | null | undefined,
  typeSlug?: string | null
): string {
  const label = singularTypeLabel(typeName, typeSlug);
  const watts = parseFloat(String(wattage ?? '').replace(/[^\d.-]/g, ''));
  if (Number.isFinite(watts) && watts > 0) {
    return `${watts}W LED ${label}`;
  }
  return `LED ${label}`;
}

export async function allocateNextProductCode(prefix: string): Promise<string> {
  const safePrefix = (prefix || 'GP').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2) || 'GP';

  return sequelize.transaction(async (transaction) => {
    await sequelize.query(
      'INSERT OR IGNORE INTO product_code_sequences (prefix, last_n) VALUES (?, 0)',
      { replacements: [safePrefix], transaction }
    );

    const [rows] = (await sequelize.query(
      'SELECT last_n FROM product_code_sequences WHERE prefix = ?',
      { replacements: [safePrefix], transaction }
    )) as [{ last_n: number }[], unknown];

    let n = Number(rows?.[0]?.last_n || 0) + 1;
    let code = formatCode(safePrefix, n);
    while (
      (await Product.findOne({ where: { product_code: code }, transaction })) ||
      (await ProductSeries.findOne({ where: { product_code: code }, transaction }))
    ) {
      n += 1;
      code = formatCode(safePrefix, n);
    }

    await sequelize.query(
      'UPDATE product_code_sequences SET last_n = ? WHERE prefix = ?',
      { replacements: [n, safePrefix], transaction }
    );

    return code;
  });
}

export async function allocateProductCodeForTypeId(typeId: number | null | undefined): Promise<string> {
  let slug = '';
  if (typeId != null && Number.isInteger(Number(typeId))) {
    const type = await ProductType.findByPk(Number(typeId));
    slug = String(type?.get('slug') || '');
  }
  return allocateNextProductCode(productCodePrefix(slug));
}

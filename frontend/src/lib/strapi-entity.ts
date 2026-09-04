/**
 * Next.js catalog/admin pages expect Strapi-like `{ id, attributes }`.
 * Express sometimes returns that shape and sometimes a flat Sequelize row.
 * Always unwrap at the fetch boundary so `.attributes.featured_image` cannot throw.
 */

export type StrapiEntity<T = Record<string, unknown>> = {
  id: number;
  attributes: T;
};

export function asStrapiEntity<T = Record<string, unknown>>(
  row: unknown
): StrapiEntity<T> | null {
  if (row == null || typeof row !== 'object') return null;
  const rec = row as { id?: number; attributes?: T } & Record<string, unknown>;
  if (rec.attributes && typeof rec.attributes === 'object' && !Array.isArray(rec.attributes)) {
    return { id: Number(rec.id) || 0, attributes: rec.attributes };
  }
  const { id, ...rest } = rec;
  return { id: Number(id) || 0, attributes: rest as T };
}

export function asStrapiList<T = Record<string, unknown>>(rows: unknown): StrapiEntity<T>[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => asStrapiEntity<T>(row))
    .filter((row): row is StrapiEntity<T> => row != null);
}

/** Normalize `{ data: entity | entity[] | null }` without turning a 404 null into a fake row. */
export function normalizeStrapiEnvelope<T>(payload: T): T {
  if (!payload || typeof payload !== 'object') return payload;
  const env = payload as { data?: unknown };
  if (!('data' in env)) return payload;
  if (env.data == null) return payload;
  if (Array.isArray(env.data)) {
    return { ...env, data: asStrapiList(env.data) } as T;
  }
  if (typeof env.data === 'object') {
    const entity = asStrapiEntity(env.data);
    return { ...env, data: entity } as T;
  }
  return payload;
}

export function catalogSeriesHref(series: {
  attributes?: {
    slug?: string;
    product_type?: { data?: { attributes?: { slug?: string } } };
    product_type_id?: number | null;
  };
  typeSlug?: string;
}): string {
  const typeSlug =
    series.typeSlug ||
    series.attributes?.product_type?.data?.attributes?.slug ||
    'products';
  const slug = series.attributes?.slug || '';
  return `/products/${typeSlug}/${slug}`;
}

export function catalogProductHref(product: {
  id?: number;
  attributes?: {
    slug?: string;
    path?: { type_slug?: string; series_slug?: string };
    series?: { data?: { attributes?: { slug?: string; product_type?: { data?: { attributes?: { slug?: string } } } } } };
    type?: { data?: { attributes?: { slug?: string } } };
    product_type?: { data?: { attributes?: { slug?: string } } };
  };
}): string {
  const a = product?.attributes || {};
  const typeSlug =
    a.path?.type_slug ||
    a.series?.data?.attributes?.product_type?.data?.attributes?.slug ||
    a.type?.data?.attributes?.slug ||
    a.product_type?.data?.attributes?.slug ||
    'products';
  const seriesSlug = a.path?.series_slug || a.series?.data?.attributes?.slug || 'general';
  const slug = a.slug || String(product?.id || '');
  return `/products/${typeSlug}/${seriesSlug}/${slug}`;
}

export function textIncludes(value: unknown, query: string): boolean {
  if (value == null) return false;
  return String(value).toLowerCase().includes(query);
}

export type AdminSeriesRow = {
  id: number;
  attributes: { name: string; slug?: string; product_type_id?: number | null };
};

export function normalizeSeriesForAdmin(row: any): AdminSeriesRow {
  if (row?.attributes?.name != null) {
    const ptId =
      row.attributes.product_type_id ??
      row.attributes.product_type?.data?.id ??
      row.product_type_id;
    return {
      id: row.id,
      attributes: {
        ...row.attributes,
        product_type_id: ptId ?? null,
      },
    };
  }
  return {
    id: row.id,
    attributes: {
      name: row.name,
      slug: row.slug,
      product_type_id: row.product_type_id ?? null,
    },
  };
}

export function normalizeProductForAdmin<T extends { id: number; attributes: Record<string, any> }>(
  row: any
): T {
  if (row?.attributes?.name != null) {
    const ra = row.attributes as Record<string, any>;
    if (!ra.series_id && ra.series && typeof ra.series === 'object' && 'id' in ra.series) {
      ra.series_id = ra.series.id;
    }
    if (!ra.series_id && ra.series?.data?.id) {
      ra.series_id = ra.series.data.id;
    }
    if (!ra.product_type_id && ra.product_type?.data?.id) {
      ra.product_type_id = ra.product_type.data.id;
    }
    if (!ra.product_type_id && ra.type?.data?.id) {
      ra.product_type_id = ra.type.data.id;
    }
    return row as T;
  }
  const { id, ...rest } = row || {};
  return { id, attributes: rest } as T;
}

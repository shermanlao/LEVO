import { Op, type ModelStatic, type WhereOptions } from 'sequelize';
import sequelize from '../database';
import ProductSeries from '../models/ProductSeries';
import ProductType from '../models/ProductType';

export const CATALOG_LIST_ORDER: Array<[string, 'ASC']> = [
  ['sort_order', 'ASC'],
  ['id', 'ASC'],
];

export function catalogTypeKey(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export function parseReorderIds(body: unknown): number[] | null {
  const ids = (body as { ids?: unknown } | null)?.ids;
  if (!Array.isArray(ids) || ids.length === 0) return null;
  const out: number[] = [];
  const seen = new Set<number>();
  for (const raw of ids) {
    const id = Number(raw);
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) return null;
    seen.add(id);
    out.push(id);
  }
  return out;
}

async function nextSortOrder(model: ModelStatic<any>, where?: WhereOptions): Promise<number> {
  const max = await model.max('sort_order', where ? { where } : {});
  const n = Number(max);
  return Number.isFinite(n) ? n + 1 : 0;
}

export function nextProductTypeSortOrder(): Promise<number> {
  return nextSortOrder(ProductType);
}

export function nextProductSeriesSortOrder(productTypeId: unknown): Promise<number> {
  const typeId = catalogTypeKey(productTypeId);
  return nextSortOrder(ProductSeries, { product_type_id: typeId });
}

export async function backfillProductTypeSortOrder(): Promise<void> {
  const rows = await ProductType.findAll({ order: [['id', 'ASC']] });
  if (!rows.length) return;
  const allZero = rows.every((row) => Number(row.get('sort_order') || 0) === 0);
  if (!allZero) return;
  for (let i = 0; i < rows.length; i += 1) {
    await rows[i].update({ sort_order: i });
  }
}

export async function backfillProductSeriesSortOrder(): Promise<void> {
  const rows = await ProductSeries.findAll({ order: [['id', 'ASC']] });
  if (!rows.length) return;
  const allZero = rows.every((row) => Number(row.get('sort_order') || 0) === 0);
  if (!allZero) return;
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = String(catalogTypeKey(row.get('product_type_id')) ?? 'none');
    const list = groups.get(key) || [];
    list.push(row);
    groups.set(key, list);
  }
  for (const list of groups.values()) {
    for (let i = 0; i < list.length; i += 1) {
      await list[i].update({ sort_order: i });
    }
  }
}

export async function applyProductTypeReorder(ids: number[]): Promise<string | null> {
  const rows = await ProductType.findAll({ where: { id: { [Op.in]: ids } } });
  if (rows.length !== ids.length) return 'Each id must be an existing product type.';
  const total = await ProductType.count();
  if (total !== ids.length) return 'Reorder list must include every product type.';
  await sequelize.transaction(async (transaction) => {
    for (let i = 0; i < ids.length; i += 1) {
      await ProductType.update({ sort_order: i }, { where: { id: ids[i] }, transaction });
    }
  });
  return null;
}

export async function applyProductSeriesReorder(ids: number[]): Promise<string | null> {
  const rows = await ProductSeries.findAll({ where: { id: { [Op.in]: ids } } });
  if (rows.length !== ids.length) return 'Each id must be an existing product series.';
  const typeKeys = new Set(rows.map((row) => String(catalogTypeKey(row.get('product_type_id')) ?? 'none')));
  if (typeKeys.size !== 1) return 'Every series in the list must belong to the same product type.';
  const typeId = catalogTypeKey(rows[0].get('product_type_id'));
  const groupCount = await ProductSeries.count({
    where: typeId == null ? { product_type_id: null } : { product_type_id: typeId },
  });
  if (groupCount !== ids.length) return 'Reorder list must include every series in that product type.';
  await sequelize.transaction(async (transaction) => {
    for (let i = 0; i < ids.length; i += 1) {
      await ProductSeries.update({ sort_order: i }, { where: { id: ids[i] }, transaction });
    }
  });
  return null;
}

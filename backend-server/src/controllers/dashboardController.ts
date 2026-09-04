import { Op, col, fn } from 'sequelize';
import { Request, Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import Product from '../models/Product';
import ProductType from '../models/ProductType';
import ProductSeries from '../models/ProductSeries';
import Project from '../models/Project';
import ContactInquiry from '../models/ContactInquiry';
import AdminUser from '../models/AdminUser';
import VisitorEvent from '../models/VisitorEvent';

const PATH_MAX = 200;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function sanitizeVisitorPath(raw: string): string | null {
  let path = String(raw || '').trim();
  if (!path.startsWith('/')) path = `/${path}`;
  const q = path.indexOf('?');
  if (q >= 0) path = path.slice(0, q);
  const hash = path.indexOf('#');
  if (hash >= 0) path = path.slice(0, hash);
  if (path.length > PATH_MAX) path = path.slice(0, PATH_MAX);
  const lower = path.toLowerCase();
  if (lower.startsWith('/admin') || lower.startsWith('/api') || lower.startsWith('/_next')) {
    return null;
  }
  if (/\.(ico|png|jpe?g|gif|webp|svg|css|js|map|woff2?|ttf|txt|xml|json)$/i.test(path)) {
    return null;
  }
  return path || null;
}

export function isVisitorKey(value: string): boolean {
  return UUID_RE.test(value);
}

export async function pruneOldVisitorEvents(): Promise<void> {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  await VisitorEvent.destroy({ where: { created_at: { [Op.lt]: cutoff } } });
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export const recordVisitorEvent = asyncHandler(async (req: Request, res: Response) => {
  const visitorKey = String(req.body?.visitor_key || '').trim();
  const path = sanitizeVisitorPath(String(req.body?.path || ''));
  if (!isVisitorKey(visitorKey) || !path) {
    return res.status(400).json({ error: 'Invalid visitor hit' });
  }
  await VisitorEvent.create({ visitor_key: visitorKey, path, created_at: new Date() });
  res.status(204).end();
});

export const getDashboardStats = asyncHandler(async (req: Request, res: Response) => {
  const includeUsers = String(req.query.includeUsers || '') === '1';
  const since = daysAgo(7);

  const [
    products,
    productTypes,
    productSeries,
    projects,
    featuredProducts,
    inquiriesTotal,
    inquiriesLast7Days,
    productsWithoutSeries,
    productsWithoutMainImage,
    users,
    pageViewsLast7Days,
    uniqueVisitorsLast7Days,
    topRows,
  ] = await Promise.all([
    Product.count(),
    ProductType.count(),
    ProductSeries.count(),
    Project.count(),
    ProductSeries.count({ where: { is_featured: true } }),
    ContactInquiry.count(),
    ContactInquiry.count({ where: { created_at: { [Op.gte]: since } } }),
    ProductSeries.count({
      where: {
        [Op.or]: [{ featured_image: { [Op.is]: null } }, { featured_image: '' }],
      },
    }),
    Product.count({
      where: {
        series_id: { [Op.ne]: null },
        [Op.or]: [{ main_image_A: { [Op.is]: null } }, { main_image_A: '' }],
      },
    }),
    includeUsers ? AdminUser.count() : Promise.resolve(null),
    VisitorEvent.count({ where: { created_at: { [Op.gte]: since } } }),
    VisitorEvent.count({
      distinct: true,
      col: 'visitor_key',
      where: { created_at: { [Op.gte]: since } },
    }),
    VisitorEvent.findAll({
      attributes: ['path', [fn('COUNT', col('id')), 'views']],
      where: { created_at: { [Op.gte]: since } },
      group: ['path'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      limit: 5,
      raw: true,
    }),
  ]);

  const topPages = (topRows as unknown as { path: string; views: number | string }[]).map((row) => ({
    path: row.path,
    views: Number(row.views) || 0,
  }));

  res.json({
    products,
    productTypes,
    productSeries,
    projects,
    featuredProducts,
    inquiriesTotal,
    inquiriesLast7Days,
    productsWithoutSeries,
    productsWithoutMainImage,
    ...(includeUsers ? { users } : {}),
    pageViewsLast7Days,
    uniqueVisitorsLast7Days,
    topPages,
  });
});

import { Op, col, fn } from 'sequelize';
import { Request, Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import Product from '../models/Product';
import ProductType from '../models/ProductType';
import ProductSeries from '../models/ProductSeries';
import SeriesAppearancePhoto from '../models/SeriesAppearancePhoto';
import Project from '../models/Project';
import ContactInquiry from '../models/ContactInquiry';
import AdminUser from '../models/AdminUser';
import VisitorEvent from '../models/VisitorEvent';
import {
  isVisitorKey,
  parseVisitorDays,
  parseVisitorParamPairs,
  sanitizeVisitorCountry,
  sanitizeVisitorPath,
  sanitizeVisitorQuery,
  sanitizeVisitorReferrer,
  visitorSiteHosts,
} from '../lib/shared/visitor-hit';

export { isVisitorKey, sanitizeVisitorPath };

export async function pruneOldVisitorEvents(): Promise<void> {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  await VisitorEvent.destroy({ where: { created_at: { [Op.lt]: cutoff } } });
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function siteOrigin(): string {
  return process.env.SITE_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || '';
}

function countLabel(rows: { label: string; views: number | string }[]): { label: string; views: number }[] {
  return rows
    .map((row) => ({ label: row.label, views: Number(row.views) || 0 }))
    .filter((row) => row.views > 0)
    .sort((a, b) => b.views - a.views || a.label.localeCompare(b.label));
}

export const recordVisitorEvent = asyncHandler(async (req: Request, res: Response) => {
  const visitorKey = String(req.body?.visitor_key || '').trim();
  const path = sanitizeVisitorPath(String(req.body?.path || ''));
  if (!isVisitorKey(visitorKey) || !path) {
    return res.status(400).json({ error: 'Invalid visitor hit' });
  }
  const hosts = visitorSiteHosts(siteOrigin());
  await VisitorEvent.create({
    visitor_key: visitorKey,
    path,
    country: sanitizeVisitorCountry(String(req.body?.country || '')),
    referrer: sanitizeVisitorReferrer(String(req.body?.referrer || ''), hosts),
    query_params: sanitizeVisitorQuery(String(req.body?.query || req.body?.query_params || '')),
    created_at: new Date(),
  });
  res.status(204).end();
});

export const getVisitorAnalysis = asyncHandler(async (req: Request, res: Response) => {
  const days = parseVisitorDays(req.query.days);
  const since = daysAgo(days);
  const where = { created_at: { [Op.gte]: since } };

  const [pageViews, uniqueVisitors, countryRows, referrerRows, queryRows, visitRows] = await Promise.all([
    VisitorEvent.count({ where }),
    VisitorEvent.count({ distinct: true, col: 'visitor_key', where }),
    VisitorEvent.findAll({
      attributes: ['country', [fn('COUNT', col('id')), 'views']],
      where,
      group: ['country'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      raw: true,
    }),
    VisitorEvent.findAll({
      attributes: ['referrer', [fn('COUNT', col('id')), 'views']],
      where,
      group: ['referrer'],
      order: [[fn('COUNT', col('id')), 'DESC']],
      raw: true,
    }),
    VisitorEvent.findAll({
      attributes: ['query_params'],
      where,
      raw: true,
    }),
    VisitorEvent.findAll({
      attributes: ['id', 'path', 'country', 'referrer', 'query_params', 'created_at'],
      where,
      order: [
        ['created_at', 'DESC'],
        ['id', 'DESC'],
      ],
      limit: 500,
    }),
  ]);

  const countries = countLabel(
    (countryRows as unknown as { country: string | null; views: number | string }[]).map((row) => ({
      label: String(row.country || '').trim() || 'Unknown',
      views: row.views,
    }))
  );
  const redirectLinks = countLabel(
    (referrerRows as unknown as { referrer: string | null; views: number | string }[]).map((row) => ({
      label: String(row.referrer || '').trim() || 'Direct',
      views: row.views,
    }))
  );

  const paramCounts = new Map<string, number>();
  for (const row of queryRows as unknown as { query_params?: string | null }[]) {
    for (const pair of parseVisitorParamPairs(row.query_params)) {
      paramCounts.set(pair, (paramCounts.get(pair) || 0) + 1);
    }
  }
  const parameters = countLabel(
    [...paramCounts.entries()].map(([label, views]) => ({ label, views }))
  );

  const visits = visitRows.map((row) => {
    const plain = row.get({ plain: true }) as {
      id: number;
      path: string;
      country: string | null;
      referrer: string | null;
      query_params: string | null;
      created_at: Date;
    };
    return {
      id: plain.id,
      path: plain.path,
      country: plain.country,
      referrer: plain.referrer,
      query_params: plain.query_params,
      created_at: plain.created_at,
    };
  });

  res.json({
    days,
    uniqueVisitors,
    pageViews,
    countries,
    redirectLinks,
    parameters,
    visits,
  });
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
    seriesWithoutAppearancePhotos,
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
    (async () => {
      const photographed = await SeriesAppearancePhoto.findAll({
        attributes: ['series_id'],
        group: ['series_id'],
        raw: true,
      });
      const ids = photographed
        .map((row) => Number((row as { series_id?: number }).series_id))
        .filter((id) => Number.isInteger(id));
      return ProductSeries.count(ids.length ? { where: { id: { [Op.notIn]: ids } } } : {});
    })(),
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
    seriesWithoutAppearancePhotos,
    ...(includeUsers ? { users } : {}),
    pageViewsLast7Days,
    uniqueVisitorsLast7Days,
    topPages,
  });
});

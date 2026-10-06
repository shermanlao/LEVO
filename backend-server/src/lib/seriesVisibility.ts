import type { Request } from 'express';
import { Op, type WhereOptions } from 'sequelize';
import { STAFF_CATALOG_HEADER, STAFF_CATALOG_HEADER_VALUE, seriesShownOnSite } from './shared/series-visibility';

export { seriesShownOnSite };

export function isStaffCatalogRequest(req: Request): boolean {
  return String(req.headers[STAFF_CATALOG_HEADER] || '') === STAFF_CATALOG_HEADER_VALUE;
}

export function publicSeriesVisibleWhere(): WhereOptions {
  return {
    [Op.or]: [{ show_on_site: true }, { show_on_site: null }],
  };
}

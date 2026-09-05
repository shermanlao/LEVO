import { Request, Response } from 'express';
import ExternalCatalogSource, {
  DEFAULT_LIGHTX_BASE_URL,
} from '../models/ExternalCatalogSource';
import { errorMessage, clientError } from '../lib/errors';
import { assertPublicHttpUrl } from '../lib/ssrf';
import {
  fetchLightXAsset,
  fetchLightXProductById,
  fetchLightXProducts,
  getActiveCatalogSource,
  getCachedPartnerPhotoUrl,
  rememberPartnerPhotoUrl,
  serializeSourceSettings,
  testLightXConnection,
} from '../lib/lightxClient';
import { importLightXProduct } from '../lib/importLightxProduct';
import { ProductSeries, ProductType } from '../models';

function statusOf(error: unknown): number {
  const status = (error as { status?: number })?.status;
  return typeof status === 'number' ? status : 500;
}

export const getSettings = async (_req: Request, res: Response) => {
  try {
    const source = await getActiveCatalogSource();
    res.json({ data: serializeSourceSettings(source) });
  } catch (error) {
    res.status(500).json({ error: clientError(error) });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const source = await getActiveCatalogSource();
    const name = req.body?.name != null ? String(req.body.name).trim() : source.name;
    const baseUrl =
      req.body?.base_url != null
        ? String(req.body.base_url).trim().replace(/\/$/, '')
        : source.base_url;
    if (baseUrl) {
      await assertPublicHttpUrl(baseUrl);
    }
    const incomingKey = req.body?.api_key != null ? String(req.body.api_key).trim() : '';
    const apiKey = !incomingKey || incomingKey.startsWith('••••') ? source.api_key : incomingKey;
    const incomingPassword =
      req.body?.api_password != null ? String(req.body.api_password) : undefined;

    await source.update({
      name: name || 'LightX',
      base_url: baseUrl || DEFAULT_LIGHTX_BASE_URL,
      api_key: apiKey || null,
      api_password:
        incomingPassword && incomingPassword.length > 0 ? incomingPassword : source.api_password,
      is_active: req.body?.is_active == null ? true : Boolean(req.body.is_active),
    });

    res.json({ data: serializeSourceSettings(source) });
  } catch (error) {
    res.status(500).json({ error: clientError(error) });
  }
};

export const testSettings = async (_req: Request, res: Response) => {
  try {
    const source = await getActiveCatalogSource();
    const result = await testLightXConnection(source);
    res.status(result.ok ? 200 : result.status || 400).json(result);
  } catch (error) {
    res.status(statusOf(error)).json({ ok: false, error: errorMessage(error) });
  }
};

export const searchProducts = async (req: Request, res: Response) => {
  try {
    const source = await getActiveCatalogSource();
    const list = await fetchLightXProducts(source, {
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      page: typeof req.query.page === 'string' ? req.query.page : undefined,
      limit: typeof req.query.limit === 'string' ? req.query.limit : undefined,
      updatedSince: typeof req.query.updatedSince === 'string' ? req.query.updatedSince : undefined,
    });
    list.products = list.products.map((item) => {
      rememberPartnerPhotoUrl(item.id, item.photos?.main);
      return {
        ...item,
        photos: {
          main: item.photos?.main
            ? `/api/admin/external-catalog/photo/${encodeURIComponent(item.id)}`
            : null,
          size: null,
          logo: null,
          other1: null,
          other2: null,
          other3: null,
        },
      };
    });
    res.json(list);
  } catch (error) {
    res.status(statusOf(error)).json({ error: errorMessage(error) });
  }
};

export const streamSearchPhoto = async (req: Request, res: Response) => {
  try {
    const source = await getActiveCatalogSource();
    const id = decodeURIComponent(String(req.params.id || '').trim());
    if (!id) return res.status(404).json({ error: 'Image not found' });

    let photoUrl = getCachedPartnerPhotoUrl(id);
    if (!photoUrl) {
      const item = await fetchLightXProductById(source, id);
      photoUrl = item.photos?.main || null;
      rememberPartnerPhotoUrl(id, photoUrl);
    }
    if (!photoUrl) return res.status(404).json({ error: 'Image not found' });

    const asset = await fetchLightXAsset(source, photoUrl);
    if (!asset.ok) {
      return res.status(asset.status || 502).json({ error: 'Image unavailable' });
    }
    res.setHeader('Content-Type', asset.contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.send(asset.buffer);
  } catch (error) {
    res.status(statusOf(error)).json({ error: errorMessage(error) });
  }
};

export const importProducts = async (req: Request, res: Response) => {
  try {
    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids.map((id: unknown) => String(id).trim()).filter(Boolean)
      : [];
    if (ids.length === 0) {
      return res.status(400).json({ error: 'Select at least one partner product to import.' });
    }

    const typeId = Number(req.body?.product_type_id);
    if (!Number.isInteger(typeId) || typeId <= 0) {
      return res.status(400).json({ error: 'Select a LEVO product category before importing.' });
    }
    const type = await ProductType.findByPk(typeId);
    if (!type) {
      return res.status(400).json({ error: 'Selected LEVO category was not found.' });
    }

    if (req.body?.series_id == null || req.body.series_id === '') {
      return res.status(400).json({ error: 'Select a LEVO series before importing.' });
    }
    const seriesId = Number(req.body.series_id);
    if (!Number.isInteger(seriesId) || seriesId <= 0) {
      return res.status(400).json({ error: 'Selected series is invalid.' });
    }
    const series = await ProductSeries.findByPk(seriesId);
    if (!series) {
      return res.status(400).json({ error: 'Selected LEVO series was not found.' });
    }
    if (Number(series.get('product_type_id')) !== typeId) {
      return res.status(400).json({ error: 'Selected series does not belong to that category.' });
    }

    const source = await getActiveCatalogSource();
    const results = [];
    for (const id of ids) {
      try {
        const item = await fetchLightXProductById(source, id);
        results.push(await importLightXProduct(item, { typeId, seriesId }));
      } catch (error) {
        results.push({
          id,
          status: 'skipped',
          reason: errorMessage(error),
        });
      }
    }

    res.json({
      data: results,
      summary: {
        created: results.filter((row) => row.status === 'created').length,
        updated: results.filter((row) => row.status === 'updated').length,
        skipped: results.filter((row) => row.status === 'skipped').length,
      },
    });
  } catch (error) {
    res.status(statusOf(error)).json({ error: errorMessage(error) });
  }
};

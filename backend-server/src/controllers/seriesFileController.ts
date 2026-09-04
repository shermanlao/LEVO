import { Request, Response } from 'express';
import { datasheetFilename } from '../lib/productSpecs';
import { buildDatasheetPdf, buildFamilyDatasheetPdf, buildFamilyInstallationPdf } from '../lib/datasheetPdf';
import { resolveSeriesConfig } from '../lib/seriesConfig';
import { generateStampedLdtText } from '../lib/photometric/generateProductLdt';
import { productToLdtStampWithSite } from '../lib/photometric/productToLdtStamp';
import { resolveVariantLdtChoice } from '../lib/photometric/productLdtChoice';
import { ldtDownloadName, previewLdtStamp } from '../lib/photometric/stampLdtFromProduct';
import { renderVariantLibraryPolarPng } from '../lib/photometric/polarPng';
import { composeDatasheetSku, type SeriesOptionDto } from '../lib/shared/series-options';
import { loadVariantCatalog } from '../lib/variantCatalog';
import { clientError } from '../lib/errors';

function wrapSpec(spec: Record<string, unknown>) {
  return { get: () => spec };
}

function queryRecord(req: Request): Record<string, unknown> {
  return req.query as Record<string, unknown>;
}

function sendPdf(res: Response, pdf: Buffer, filename: string) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.setHeader('Cache-Control', 'private, max-age=60');
  return res.send(pdf);
}

async function seriesLdtStamp(
  spec: Record<string, unknown>,
  grouped?: Record<string, SeriesOptionDto[]>
) {
  const stamp = await productToLdtStampWithSite(spec);
  const catalog = await loadVariantCatalog();
  const sku = composeDatasheetSku(spec, catalog, grouped);
  if (sku) stamp.article = sku;
  return stamp;
}

export async function getSeriesDatasheet(req: Request, res: Response) {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) return res.status(400).json({ error: 'Missing series slug' });
    const resolved = await resolveSeriesConfig(slug, queryRecord(req), { requireComplete: true });
    if (!resolved.ok) return res.status(resolved.status).json({ error: resolved.error });
    const pdf = await buildDatasheetPdf(wrapSpec(resolved.config.spec));
    return sendPdf(res, pdf, datasheetFilename(resolved.config.orderingCode, slug));
  } catch (error) {
    console.error('Series datasheet PDF generation failed:', error);
    return res.status(500).json({ error: clientError(error) });
  }
}

export async function getSeriesFamilyDatasheet(req: Request, res: Response) {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) return res.status(400).json({ error: 'Missing series slug' });
    const built = await buildFamilyDatasheetPdf(slug);
    if (!built) return res.status(404).json({ error: 'Series not found' });
    return sendPdf(res, built.pdf, built.filename);
  } catch (error) {
    console.error('Series family datasheet PDF generation failed:', error);
    return res.status(500).json({ error: clientError(error) });
  }
}

export async function getSeriesInstallation(req: Request, res: Response) {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) return res.status(400).json({ error: 'Missing series slug' });
    const built = await buildFamilyInstallationPdf(slug);
    if (!built) return res.status(404).json({ error: 'Series not found' });
    return sendPdf(res, built.pdf, built.filename);
  } catch (error) {
    console.error('Series installation PDF generation failed:', error);
    return res.status(500).json({ error: clientError(error) });
  }
}

export async function getSeriesLdt(req: Request, res: Response) {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) return res.status(400).json({ error: 'Missing series slug' });
    const resolved = await resolveSeriesConfig(slug, queryRecord(req), { requireComplete: true });
    if (!resolved.ok) return res.status(resolved.status).json({ error: resolved.error });
    const spec = resolved.config.spec;
    const stamp = await seriesLdtStamp(spec, resolved.config.grouped);
    const choice = resolveVariantLdtChoice(spec, stamp);
    const preview = previewLdtStamp(stamp, choice.family);
    if (preview.lumen == null || preview.lumen <= 0) {
      return res.status(400).json({ error: 'Lumen output is required to generate an LDT file' });
    }
    const { text } = await generateStampedLdtText(stamp, {
      family: choice.family,
      beamDegrees: choice.beamDegrees,
    });
    const fileName = ldtDownloadName(stamp);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.send(text);
  } catch (error) {
    console.error('Series LDT generation failed:', error);
    return res.status(500).json({ error: clientError(error) });
  }
}

export async function getSeriesPolar(req: Request, res: Response) {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) return res.status(400).json({ error: 'Missing series slug' });
    const resolved = await resolveSeriesConfig(slug, queryRecord(req), { requireComplete: false });
    if (!resolved.ok) return res.status(resolved.status).json({ error: resolved.error });
    const spec = resolved.config.spec;
    const png = await renderVariantLibraryPolarPng(
      spec,
      await seriesLdtStamp(spec, resolved.config.grouped)
    );
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=60');
    return res.send(png);
  } catch (error) {
    console.error('Series polar PNG generation failed:', error);
    return res.status(500).json({ error: clientError(error) });
  }
}

import { Request, Response } from 'express';
import multer from 'multer';
import PhotometricBeamTemplate from '../models/PhotometricBeamTemplate';
import { errorMessage, clientError } from '../lib/errors';
import {
  isLibraryBeamDegrees,
  isPhotometricFamily,
} from '../lib/photometric/beamLibrary';
import {
  ensurePhotometricBeamLibrary,
  getBeamTemplate,
  readBeamTemplateText,
  writeCalculatedBeamFile,
  writeUploadedBeamFile,
} from '../lib/photometric/beamLibraryServer';
import { parseEulumdat } from '../lib/photometric/eulumdat';
import { svgOrLdtToPolarPng } from '../lib/photometric/polarPng';

export const ldtUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

function serializeTemplate(row: PhotometricBeamTemplate) {
  const p = row.get({ plain: true }) as {
    id: number;
    beamDegrees: number;
    family: string;
    fileName: string;
    fileSize: number;
    source: string;
    uploadedAt?: Date | null;
    updatedAt?: Date | null;
  };
  return {
    id: p.id,
    beamDegrees: p.beamDegrees,
    family: p.family,
    fileName: p.fileName,
    fileSize: p.fileSize,
    source: p.source,
    uploadedAt: p.uploadedAt ? new Date(p.uploadedAt).toISOString() : null,
    updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : null,
  };
}

export const listTemplates = async (_req: Request, res: Response) => {
  try {
    await ensurePhotometricBeamLibrary();
    const rows = await PhotometricBeamTemplate.findAll({
      order: [
        ['family', 'ASC'],
        ['beamDegrees', 'ASC'],
      ],
    });
    res.json({ templates: rows.map(serializeTemplate) });
  } catch (error) {
    res.status(500).json({ error: clientError(error) });
  }
};

export const getLibraryLdt = async (req: Request, res: Response) => {
  try {
    const familyRaw = String(req.query.family || 'circular');
    if (!isPhotometricFamily(familyRaw)) {
      return res.status(400).json({ error: 'Choose circular or linear' });
    }
    const beamDegrees = Number(req.query.beamDegrees);
    if (!Number.isInteger(beamDegrees) || !isLibraryBeamDegrees(familyRaw, beamDegrees)) {
      return res.status(400).json({ error: 'Choose a library beam angle' });
    }
    const template = await getBeamTemplate(familyRaw, beamDegrees);
    const text = readBeamTemplateText(String(template.get('filePath')), familyRaw, beamDegrees);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.send(text);
  } catch (error) {
    res.status(500).json({ error: clientError(error) });
  }
};

export const postPolarImage = async (req: Request, res: Response) => {
  try {
    const body = (req.body || {}) as { svg?: string; ldtText?: string };
    const png = await svgOrLdtToPolarPng(body);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'no-store');
    res.send(png);
  } catch (error) {
    const message = errorMessage(error);
    const status = /provide svg/i.test(message) ? 400 : 500;
    res.status(status).json({ error: message });
  }
};

export const downloadTemplate = async (req: Request, res: Response) => {
  try {
    const row = await PhotometricBeamTemplate.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'Template not found' });
    const family = String(row.get('family'));
    const beamDegrees = Number(row.get('beamDegrees'));
    if (!isPhotometricFamily(family) || !isLibraryBeamDegrees(family, beamDegrees)) {
      return res.status(404).json({ error: 'Template not found' });
    }
    const text = readBeamTemplateText(String(row.get('filePath')), family, beamDegrees);
    const fileName = String(row.get('fileName') || `beam-${beamDegrees}.ldt`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(text);
  } catch (error) {
    res.status(500).json({ error: clientError(error) });
  }
};

export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const row = await PhotometricBeamTemplate.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: 'Template not found' });
    const family = String(row.get('family'));
    const beamDegrees = Number(row.get('beamDegrees'));
    if (!isPhotometricFamily(family) || !isLibraryBeamDegrees(family, beamDegrees)) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const contentType = String(req.headers['content-type'] || '');
    if (contentType.includes('application/json')) {
      const action = (req.body as { action?: string })?.action;
      if (action !== 'restore') {
        return res.status(400).json({ error: 'Unknown action' });
      }
      const file = writeCalculatedBeamFile(family, beamDegrees);
      await row.update({
        fileName: file.fileName,
        filePath: file.filePath,
        fileSize: file.fileSize,
        source: 'calculated',
        uploadedAt: null,
      });
      return res.json(serializeTemplate(row));
    }

    const uploaded = (req as Request & { file?: Express.Multer.File }).file;
    if (!uploaded) {
      return res.status(400).json({ error: 'LDT file is required' });
    }
    const name = (uploaded.originalname || '').toLowerCase();
    if (!name.endsWith('.ldt')) {
      return res.status(400).json({ error: 'Only .ldt files are allowed' });
    }
    const text = uploaded.buffer.toString('utf8');
    try {
      parseEulumdat(text);
    } catch (err) {
      return res.status(400).json({ error: errorMessage(err) });
    }

    const file = writeUploadedBeamFile(family, beamDegrees, text);
    const safeName = uploaded.originalname.replace(/[\\/]+/g, '').slice(0, 120) || file.fileName;
    await row.update({
      fileName: safeName,
      filePath: file.filePath,
      fileSize: file.fileSize,
      source: 'uploaded',
      uploadedAt: new Date(),
    });
    res.json(serializeTemplate(row));
  } catch (error) {
    res.status(500).json({ error: clientError(error) });
  }
};

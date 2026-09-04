import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import PhotometricBeamTemplate from '../../models/PhotometricBeamTemplate';
import {
  PHOTOMETRIC_FAMILIES,
  beamTemplateFileName,
  beamTemplatePublicPath,
  beamTemplateRelativeDir,
  isLibraryBeamDegrees,
  libraryBeamsForFamily,
  type PhotometricFamily,
} from './beamLibrary';
import { isCircularBeamDegrees, isLinearBeamDegrees } from './parseBeamAngle';
import { synthesizeCircularLdt } from './synthesizeCircularLdt';
import { synthesizeLinearLdt } from './synthesizeLinearLdt';

const PATH_PREFIX = '/uploads/photometric-library/';

export function photometricPublicRoot(): string {
  return path.join(__dirname, '..', '..', '..', '..', 'frontend', 'public');
}

export function isValidPhotometricLibraryPath(filePath: string): boolean {
  let normalized = filePath.trim();
  if (normalized.includes('..')) return false;
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  return normalized.startsWith(PATH_PREFIX) && normalized.toLowerCase().endsWith('.ldt');
}

export function resolvePhotometricLibraryFileOnDisk(filePath: string): string | null {
  let normalizedPath = filePath.trim();
  if (!normalizedPath.startsWith('/')) normalizedPath = `/${normalizedPath}`;
  if (!isValidPhotometricLibraryPath(normalizedPath)) return null;

  const candidates = [
    path.join(photometricPublicRoot(), normalizedPath.replace(/^\//, '')),
    path.join(process.cwd(), '..', 'frontend', 'public', normalizedPath.replace(/^\//, '')),
    path.join(process.cwd(), 'frontend', 'public', normalizedPath.replace(/^\//, '')),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function synthesizeFamilyLdt(family: PhotometricFamily, beamDegrees: number): string {
  if (family === 'linear') {
    if (!isLinearBeamDegrees(beamDegrees)) {
      throw new Error('Beam is not in the linear library');
    }
    return synthesizeLinearLdt(beamDegrees);
  }
  if (!isCircularBeamDegrees(beamDegrees)) {
    throw new Error('Beam is not in the circular library');
  }
  return synthesizeCircularLdt(beamDegrees);
}

export function photometricLibraryWritePath(
  family: PhotometricFamily,
  beamDegrees: number
): string {
  const dir = path.join(photometricPublicRoot(), ...beamTemplateRelativeDir(family));
  mkdirSync(dir, { recursive: true });
  return path.join(dir, beamTemplateFileName(beamDegrees));
}

export function writeCalculatedBeamFile(
  family: PhotometricFamily,
  beamDegrees: number
): {
  filePath: string;
  fileName: string;
  fileSize: number;
} {
  const abs = photometricLibraryWritePath(family, beamDegrees);
  const text = synthesizeFamilyLdt(family, beamDegrees);
  writeFileSync(abs, text, 'utf8');
  return {
    filePath: beamTemplatePublicPath(family, beamDegrees),
    fileName: beamTemplateFileName(beamDegrees),
    fileSize: Buffer.byteLength(text, 'utf8'),
  };
}

export function writeUploadedBeamFile(
  family: PhotometricFamily,
  beamDegrees: number,
  text: string
): {
  filePath: string;
  fileName: string;
  fileSize: number;
} {
  const abs = photometricLibraryWritePath(family, beamDegrees);
  writeFileSync(abs, text, 'utf8');
  return {
    filePath: beamTemplatePublicPath(family, beamDegrees),
    fileName: beamTemplateFileName(beamDegrees),
    fileSize: Buffer.byteLength(text, 'utf8'),
  };
}

export function readBeamTemplateText(
  filePath: string,
  family: PhotometricFamily,
  beamDegrees: number
): string {
  const onDisk = resolvePhotometricLibraryFileOnDisk(filePath);
  if (onDisk) return readFileSync(onDisk, 'utf8');
  const written = writeCalculatedBeamFile(family, beamDegrees);
  const fallback = resolvePhotometricLibraryFileOnDisk(written.filePath);
  if (!fallback) {
    throw new Error('Could not read or recreate the beam library file');
  }
  return readFileSync(fallback, 'utf8');
}

export async function ensurePhotometricBeamLibrary(opts?: {
  rewriteCalculated?: boolean;
}): Promise<void> {
  const existing = await PhotometricBeamTemplate.findAll();
  const byKey = new Map(
    existing.map((row) => {
      const plain = row.get({ plain: true }) as { family: string; beamDegrees: number };
      return [`${plain.family}:${plain.beamDegrees}`, row];
    })
  );

  for (const family of PHOTOMETRIC_FAMILIES) {
    for (const beamDegrees of libraryBeamsForFamily(family)) {
      const row = byKey.get(`${family}:${beamDegrees}`);
      const source = row ? String(row.get('source') || 'calculated') : '';
      if (source === 'uploaded') continue;

      const filePath = row ? String(row.get('filePath') || '') : '';
      const missingOnDisk = !row || !resolvePhotometricLibraryFileOnDisk(filePath);
      if (row && !missingOnDisk && !opts?.rewriteCalculated) continue;

      const file = writeCalculatedBeamFile(family, beamDegrees);
      if (!row) {
        await PhotometricBeamTemplate.create({
          beamDegrees,
          family,
          fileName: file.fileName,
          filePath: file.filePath,
          fileSize: file.fileSize,
          source: 'calculated',
        });
        continue;
      }
      await row.update({
        fileName: file.fileName,
        filePath: file.filePath,
        fileSize: file.fileSize,
      });
    }
  }
}

export async function getBeamTemplate(family: PhotometricFamily, beamDegrees: number) {
  if (!isLibraryBeamDegrees(family, beamDegrees)) {
    throw new Error('Beam is not in the library');
  }
  await ensurePhotometricBeamLibrary();
  const row = await PhotometricBeamTemplate.findOne({
    where: { family, beamDegrees },
  });
  if (!row) {
    throw new Error('Beam template not found');
  }
  return row;
}

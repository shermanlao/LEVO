import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { isAllowedImageBuffer } from '../lib/shared/image-magic';

const router = Router();

const UPLOADS_DIR = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'images', 'products');

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    cb(null, UPLOADS_DIR);
  },
  filename: function (_req, file, cb) {
    const ext = ALLOWED_MIME[file.mimetype] || path.extname(path.basename(file.originalname || '')).toLowerCase();
    const safeExt = Object.values(ALLOWED_MIME).includes(ext) ? ext : '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME[file.mimetype]) {
      cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
      return;
    }
    cb(null, true);
  },
});

router.post('/', upload.array('files'), (req, res) => {
  const uploaded = req.files;
  if (!uploaded || !Array.isArray(uploaded) || uploaded.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  for (const file of uploaded) {
    const bytes = fs.readFileSync(file.path);
    if (!isAllowedImageBuffer(bytes)) {
      for (const row of uploaded) {
        try {
          fs.unlinkSync(row.path);
        } catch {
          /* ignore */
        }
      }
      return res.status(400).json({ error: 'File is not a valid JPEG, PNG, WebP, or GIF image' });
    }
  }
  const fileInfos = uploaded.map((file) => ({
    filename: file.filename,
    originalname: path.basename(file.originalname || file.filename),
    url: `/uploads/${file.filename}`,
  }));
  res.json({ files: fileInfos });
});

export default router;

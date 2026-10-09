import type { Response } from 'express';

export function sendPdf(
  res: Response,
  pdf: Buffer,
  filename: string,
  cacheControl = 'private, max-age=60',
  disposition: 'inline' | 'attachment' = 'inline'
) {
  const safeName = String(filename || 'download.pdf').replace(/["\r\n]/g, '');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${disposition}; filename="${safeName}"`);
  res.setHeader('Cache-Control', cacheControl);
  return res.send(pdf);
}

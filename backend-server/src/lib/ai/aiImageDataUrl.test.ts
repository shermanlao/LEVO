import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import sharp from 'sharp';
import {
  AI_IMAGE_MAX_EDGE,
  compactAiImageDataUrl,
  parseImageDataUrl,
} from './aiImageDataUrl';

describe('parseImageDataUrl', () => {
  it('reads a standard jpeg data URL', () => {
    const parsed = parseImageDataUrl('data:image/jpeg;base64,Zm9v');
    assert.equal(parsed.mimeType, 'image/jpeg');
    assert.equal(parsed.base64, 'Zm9v');
  });

  it('accepts charset and image/jpg', () => {
    const parsed = parseImageDataUrl('data:image/jpg;charset=utf-8;base64,Zm9v');
    assert.equal(parsed.mimeType, 'image/jpeg');
    assert.equal(parsed.base64, 'Zm9v');
  });
});

describe('compactAiImageDataUrl', () => {
  it('downscales a large png to a jpeg within the max edge', async () => {
    const png = await sharp({
      create: { width: 1800, height: 1200, channels: 3, background: { r: 20, g: 20, b: 20 } },
    })
      .png()
      .toBuffer();
    const compact = await compactAiImageDataUrl(`data:image/png;base64,${png.toString('base64')}`);
    const parsed = parseImageDataUrl(compact);
    assert.equal(parsed.mimeType, 'image/jpeg');
    const meta = await sharp(Buffer.from(parsed.base64, 'base64')).metadata();
    assert.ok((meta.width || 0) <= AI_IMAGE_MAX_EDGE);
    assert.ok((meta.height || 0) <= AI_IMAGE_MAX_EDGE);
  });
});

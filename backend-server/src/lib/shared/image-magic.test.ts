import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { detectImageKind } from './image-magic';

describe('image magic bytes', () => {
  it('detects JPEG PNG GIF WebP and rejects other bytes', () => {
    assert.equal(detectImageKind(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0])), 'jpeg');
    assert.equal(detectImageKind(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'png');
    assert.equal(detectImageKind(Uint8Array.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])), 'gif');
    assert.equal(
      detectImageKind(
        Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
      ),
      'webp'
    );
    assert.equal(detectImageKind(Uint8Array.from([0x00, 0x01, 0x02])), null);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assignXaiEditImages, orderedEditImageUrls } from './aiImageGeneration';

describe('assignXaiEditImages', () => {
  it('omits image fields when there are no source photos', () => {
    const body: Record<string, unknown> = {};
    assignXaiEditImages(body, []);
    assert.equal(body.image, undefined);
    assert.equal(body.images, undefined);
  });

  it('sends one photo as the image object', () => {
    const body: Record<string, unknown> = {};
    assignXaiEditImages(body, ['data:image/jpeg;base64,aaa']);
    assert.deepEqual(body.image, { url: 'data:image/jpeg;base64,aaa', type: 'image_url' });
    assert.equal(body.images, undefined);
  });

  it('sends two photos as image strings, not maps', () => {
    const body: Record<string, unknown> = {};
    assignXaiEditImages(body, ['data:image/jpeg;base64,product', 'data:image/jpeg;base64,style']);
    assert.deepEqual(body.image, [
      'data:image/jpeg;base64,product',
      'data:image/jpeg;base64,style',
    ]);
    assert.equal(body.images, undefined);
  });
});

describe('orderedEditImageUrls', () => {
  it('keeps size-drawing extras first by default', () => {
    assert.deepEqual(orderedEditImageUrls('data:product', ['data:style']), ['data:style', 'data:product']);
  });

  it('puts the product first for catalog style match', () => {
    assert.deepEqual(orderedEditImageUrls('data:product', ['data:style'], true), [
      'data:product',
      'data:style',
    ]);
  });
});

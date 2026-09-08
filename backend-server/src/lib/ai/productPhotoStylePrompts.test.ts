import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_PRODUCT_PHOTO_STYLE_PROMPT,
  PRODUCT_PHOTO_STYLE_LOCK,
  fillProductPhotoStylePrompt,
} from './productPhotoStylePrompts';

describe('fillProductPhotoStylePrompt', () => {
  it('prepends the look-only lock and fills hints', () => {
    const prompt = fillProductPhotoStylePrompt(DEFAULT_PRODUCT_PHOTO_STYLE_PROMPT, 'Keep warm light');
    assert.ok(prompt.startsWith(PRODUCT_PHOTO_STYLE_LOCK));
    assert.match(prompt, /Organization notes: Keep warm light/);
    assert.match(prompt, /<IMAGE_0>/);
    assert.match(prompt, /<IMAGE_1>/);
  });

  it('omits the hints line when empty', () => {
    const prompt = fillProductPhotoStylePrompt(DEFAULT_PRODUCT_PHOTO_STYLE_PROMPT, '  ');
    assert.equal(prompt.includes('Organization notes:'), false);
  });
});

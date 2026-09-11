import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_PRODUCT_PHOTO_STYLE_PROMPT,
  LEGACY_PRODUCT_PHOTO_STYLE_PROMPT,
  LEGACY_THREE_STEP_PRODUCT_PHOTO_STYLE_PROMPT,
  PRODUCT_PHOTO_STYLE_LOCK,
  fillProductPhotoStylePrompt,
  isLegacyProductPhotoStylePrompt,
  resolveProductPhotoStylePromptTemplate,
} from './productPhotoStylePrompts';
import { buildOriginalPhotoDescribePrompt, chatVisionModelId } from './productPhotoDescribeAi';

describe('fillProductPhotoStylePrompt', () => {
  it('prepends the look-only lock and fills hints', () => {
    const prompt = fillProductPhotoStylePrompt(DEFAULT_PRODUCT_PHOTO_STYLE_PROMPT, 'Keep warm light');
    assert.ok(prompt.startsWith(PRODUCT_PHOTO_STYLE_LOCK));
    assert.match(prompt, /Organization notes: Keep warm light/);
    assert.match(prompt, /<IMAGE_0>/);
    assert.match(prompt, /<IMAGE_1>/);
    assert.match(prompt, /STEP 1/);
    assert.match(prompt, /STEP 2/);
    assert.match(prompt, /STEP 3/);
  });

  it('omits the hints line when empty', () => {
    const prompt = fillProductPhotoStylePrompt(DEFAULT_PRODUCT_PHOTO_STYLE_PROMPT, '  ');
    assert.equal(prompt.includes('Organization notes:'), false);
  });

  it('always injects the filled phrase template', () => {
    const prompt = fillProductPhotoStylePrompt(
      DEFAULT_PRODUCT_PHOTO_STYLE_PROMPT,
      null,
      'Recessed downlight; Ø105mm; White trim'
    );
    assert.match(prompt, /FIXTURE DESCRIPTION/);
    assert.match(prompt, /Recessed downlight; Ø105mm; White trim/);
  });

  it('always injects the original-photo description or a describe-first fallback', () => {
    const withSeen = fillProductPhotoStylePrompt(
      DEFAULT_PRODUCT_PHOTO_STYLE_PROMPT,
      null,
      null,
      'White recessed downlight, 45-degree view, visible spring clips'
    );
    assert.match(withSeen, /ORIGINAL PHOTO DESCRIPTION/);
    assert.match(withSeen, /visible spring clips/);

    const withoutSeen = fillProductPhotoStylePrompt(DEFAULT_PRODUCT_PHOTO_STYLE_PROMPT, null, null, '');
    assert.match(withoutSeen, /Describe <IMAGE_0> yourself before STEP 1/);
  });

  it('always injects the square catalog placeholder size', () => {
    const prompt = fillProductPhotoStylePrompt(DEFAULT_PRODUCT_PHOTO_STYLE_PROMPT);
    assert.match(prompt, /PLACEHOLDER SIZE/);
    assert.match(prompt, /1600×1600 px/);
    assert.match(prompt, /1:1/);
  });
});

describe('resolveProductPhotoStylePromptTemplate', () => {
  it('replaces the stored legacy default with the 3-step prompt', () => {
    assert.equal(isLegacyProductPhotoStylePrompt(LEGACY_PRODUCT_PHOTO_STYLE_PROMPT), true);
    assert.equal(isLegacyProductPhotoStylePrompt(LEGACY_THREE_STEP_PRODUCT_PHOTO_STYLE_PROMPT), true);
    assert.equal(
      resolveProductPhotoStylePromptTemplate(LEGACY_THREE_STEP_PRODUCT_PHOTO_STYLE_PROMPT),
      DEFAULT_PRODUCT_PHOTO_STYLE_PROMPT
    );
    assert.equal(
      resolveProductPhotoStylePromptTemplate(LEGACY_PRODUCT_PHOTO_STYLE_PROMPT),
      DEFAULT_PRODUCT_PHOTO_STYLE_PROMPT
    );
    assert.equal(resolveProductPhotoStylePromptTemplate('Custom staff prompt'), 'Custom staff prompt');
  });
});

describe('describe original photo helpers', () => {
  it('asks the chat model to describe what it sees', () => {
    const prompt = buildOriginalPhotoDescribePrompt('Recessed downlight; White trim');
    assert.match(prompt, /ORIGINAL PHOTO/);
    assert.match(prompt, /White trim/);
    assert.match(prompt, /hidden after install/);
  });

  it('swaps Imagine models for a chat vision model', () => {
    assert.equal(
      chatVisionModelId({
        provider: 'xai',
        apiKey: 'x',
        baseUrl: 'https://api.x.ai/v1',
        modelId: 'grok-imagine-image-quality',
      }),
      'grok-4.3'
    );
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_SIZE_DRAWING_PROMPT,
  fillSizeDrawingPrompt,
} from './sizeDrawingPrompts';

describe('fillSizeDrawingPrompt', () => {
  it('always injects series description and filled phrase', () => {
    const prompt = fillSizeDrawingPrompt(DEFAULT_SIZE_DRAWING_PROMPT, {
      size: 'Dia115 x H115mm',
      cuthole: 'Dia105mm',
      description: 'Recessed downlight for low ceilings.',
      fixtureDescription: 'Recessed downlight; Dia115; White trim',
    });
    assert.match(prompt, /PRODUCT DESCRIPTION/);
    assert.match(prompt, /Recessed downlight for low ceilings/);
    assert.match(prompt, /FIXTURE PHRASE/);
    assert.match(prompt, /White trim/);
    assert.match(prompt, /Dia115 x H115mm/);
    assert.match(prompt, /Dia105mm/);
  });

  it('omits description lines when empty', () => {
    const prompt = fillSizeDrawingPrompt(DEFAULT_SIZE_DRAWING_PROMPT, {
      size: 'Dia80mm',
    });
    assert.equal(prompt.includes('PRODUCT DESCRIPTION'), false);
    assert.equal(prompt.includes('FIXTURE PHRASE'), false);
    assert.match(prompt, /Dia80mm/);
  });

  it('injects description even when the stored template has no placeholders', () => {
    const prompt = fillSizeDrawingPrompt('Draw a 2D elevation. {{size}}', {
      size: 'H40mm',
      description: 'Surface cylinder.',
    });
    assert.match(prompt, /PRODUCT DESCRIPTION/);
    assert.match(prompt, /Surface cylinder/);
    assert.match(prompt, /H40mm/);
  });
});

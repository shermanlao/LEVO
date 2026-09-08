import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fillPhraseTemplate, phraseSpecFromOptionDrafts } from './description-phrase';

describe('phraseSpecFromOptionDrafts', () => {
  it('uses this size pack and joins other series tags', () => {
    const spec = phraseSpecFromOptionDrafts(
      {
        size: [{ value: 'Ø90', dimensions: 'Ø90mm', cutout_size: '80mm' }],
        colour: [{ value: 'White' }, { value: 'Black' }],
        wattage: [{ value: '10W', lumen: '900', system_lumen: '800' }],
        cct: [{ value: '3000K' }],
      },
      { value: 'Ø105', dimensions: 'Ø105mm', cutout_size: '95mm' }
    );
    assert.equal(spec.size, 'Ø105mm');
    assert.equal(spec.dimensions, 'Ø105mm');
    assert.equal(spec.cutout_size, '95mm');
    assert.equal(spec.colour, 'White / Black');
    assert.equal(spec.wattage, '10W');
    assert.equal(spec.lumen, '900');
    assert.equal(spec.cct, '3000K');
  });
});

describe('fillPhraseTemplate', () => {
  it('fills a style-match phrase from the pack spec', () => {
    const spec = phraseSpecFromOptionDrafts(
      { colour: [{ value: 'White' }], mounting_type: [{ value: 'Recessed' }] },
      { dimensions: 'Ø105mm', cutout_size: '95mm' }
    );
    const phrase = fillPhraseTemplate(
      'Recessed downlight; {{dimensions}}; {{cutout_size}} cutout; {{mounting_type}} mounting; {{colour}} trim',
      spec
    );
    assert.equal(phrase, 'Recessed downlight; Ø105mm; 95mm cutout; Recessed mounting; White trim');
  });
});

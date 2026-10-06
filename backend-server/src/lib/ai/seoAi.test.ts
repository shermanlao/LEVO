import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clampSeoText, parseSeoModelText } from './seoAi';

describe('SEO model text', () => {
  it('reads a fenced JSON object and trims wrapping quotes', () => {
    const parsed = parseSeoModelText(
      '```json\n{"title":"\\"DL7 recessed downlight\\"","description":"Recessed LED downlight for hotels and retail ceilings."}\n```',
      'series'
    );
    assert.equal(parsed.title, 'DL7 recessed downlight');
    assert.equal(parsed.description, 'Recessed LED downlight for hotels and retail ceilings.');
  });

  it('cuts a long title on a word boundary', () => {
    const title = clampSeoText('Architectural recessed LED downlight for hotel lobbies and retail ceilings', 40);
    assert.ok(title.length <= 40);
    assert.equal(title, 'Architectural recessed LED downlight');
  });

  it('rejects a reply that is not JSON', () => {
    assert.throws(() => parseSeoModelText('Here is a title.', 'project'), /SEO JSON/);
  });
});

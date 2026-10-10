import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseCatalogDescription } from './catalogDescriptionAi';

describe('catalog description model text', () => {
  it('reads a fenced JSON object and trims wrapping quotes', () => {
    const description = parseCatalogDescription(
      '```json\n{"description":"\\"Recessed LED downlights for hotel and retail ceilings.\\""}\n```'
    );
    assert.equal(description, 'Recessed LED downlights for hotel and retail ceilings.');
  });

  it('cuts a long description on a word boundary', () => {
    const long = `Architectural ${'recessed '.repeat(40)}downlights`;
    const description = parseCatalogDescription(JSON.stringify({ description: long }));
    assert.ok(description.length <= 320);
    assert.ok(description.length < long.length);
  });

  it('rejects a reply that is not JSON', () => {
    assert.throws(() => parseCatalogDescription('Here is a description.'), /description JSON/);
  });
});

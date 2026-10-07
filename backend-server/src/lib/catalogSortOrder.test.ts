import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { catalogTypeKey, parseReorderIds } from './catalogSortOrder';

describe('catalogSortOrder', () => {
  it('parses a unique list of positive ids', () => {
    assert.deepEqual(parseReorderIds({ ids: [3, '2', 1] }), [3, 2, 1]);
  });

  it('rejects empty, duplicate, or invalid ids', () => {
    assert.equal(parseReorderIds({ ids: [] }), null);
    assert.equal(parseReorderIds({ ids: [1, 1] }), null);
    assert.equal(parseReorderIds({ ids: [0, 2] }), null);
    assert.equal(parseReorderIds({ ids: ['x'] }), null);
    assert.equal(parseReorderIds({}), null);
  });

  it('treats missing type ids as null', () => {
    assert.equal(catalogTypeKey(null), null);
    assert.equal(catalogTypeKey(0), null);
    assert.equal(catalogTypeKey('4'), 4);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { seriesShownOnSite } from './series-visibility';

describe('seriesShownOnSite', () => {
  it('defaults missing and null to on', () => {
    assert.equal(seriesShownOnSite(undefined), true);
    assert.equal(seriesShownOnSite(null), true);
    assert.equal(seriesShownOnSite(''), true);
    assert.equal(seriesShownOnSite(true), true);
    assert.equal(seriesShownOnSite(1), true);
  });

  it('treats falsey stored flags as off', () => {
    assert.equal(seriesShownOnSite(false), false);
    assert.equal(seriesShownOnSite(0), false);
    assert.equal(seriesShownOnSite('0'), false);
    assert.equal(seriesShownOnSite('false'), false);
  });
});

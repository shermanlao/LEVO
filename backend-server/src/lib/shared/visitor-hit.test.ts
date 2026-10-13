import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isVisitorKey,
  parseVisitorDays,
  parseVisitorParamPairs,
  sanitizeVisitorCountry,
  sanitizeVisitorDuration,
  sanitizeVisitorPath,
  sanitizeVisitorQuery,
  sanitizeVisitorReferrer,
  stayMsForEvents,
  visitorSiteHosts,
} from './visitor-hit';

describe('visitor hit sanitizers', () => {
  it('accepts UUID visitor keys and public paths', () => {
    assert.equal(isVisitorKey('550e8400-e29b-41d4-a716-446655440000'), true);
    assert.equal(isVisitorKey('not-a-uuid'), false);
    assert.equal(sanitizeVisitorPath('/products/downlights?utm_source=x#top'), '/products/downlights');
    assert.equal(sanitizeVisitorPath('/admin/visitors'), null);
    assert.equal(sanitizeVisitorPath('/favicon.ico'), null);
  });

  it('treats same-site referrers as direct and keeps external http(s) links', () => {
    const hosts = visitorSiteHosts('https://levolight.com');
    assert.ok(hosts.includes('levolight.com'));
    assert.ok(hosts.includes('www.levolight.com'));
    assert.equal(sanitizeVisitorReferrer('https://levolight.com/products', hosts), null);
    assert.equal(sanitizeVisitorReferrer('', hosts), null);
    assert.equal(sanitizeVisitorReferrer('javascript:alert(1)', hosts), null);
    assert.equal(
      sanitizeVisitorReferrer('https://www.google.com/search?q=levo&token=secret', hosts),
      'https://www.google.com/search?q=levo'
    );
  });

  it('drops password-like query keys and keeps utm pairs', () => {
    assert.equal(
      sanitizeVisitorQuery('?utm_source=google&password=x&utm_medium=cpc'),
      'utm_medium=cpc&utm_source=google'
    );
    assert.equal(sanitizeVisitorQuery(''), null);
    assert.deepEqual(parseVisitorParamPairs('utm_source=google&utm_medium=cpc'), [
      'utm_source=google',
      'utm_medium=cpc',
    ]);
  });

  it('accepts ISO country codes and 7/30/90 day ranges', () => {
    assert.equal(sanitizeVisitorCountry('hk'), 'HK');
    assert.equal(sanitizeVisitorCountry('USA'), null);
    assert.equal(parseVisitorDays('30'), 30);
    assert.equal(parseVisitorDays('9'), 7);
  });

  it('caps stay time and fills a gap until the next page by the same visitor', () => {
    assert.equal(sanitizeVisitorDuration(1500), 1500);
    assert.equal(sanitizeVisitorDuration(-1), null);
    assert.equal(sanitizeVisitorDuration(60 * 60 * 1000), 30 * 60 * 1000);
    const stays = stayMsForEvents([
      { id: 1, visitor_key: 'a', created_at: '2026-10-11T05:43:02.000Z', duration_ms: null },
      { id: 2, visitor_key: 'a', created_at: '2026-10-11T05:43:08.000Z', duration_ms: null },
      { id: 3, visitor_key: 'b', created_at: '2026-10-11T05:43:19.000Z', duration_ms: 4000 },
    ]);
    assert.equal(stays.get(1), 6000);
    assert.equal(stays.get(2), null);
    assert.equal(stays.get(3), 4000);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isVisitorKey,
  parseVisitorDays,
  parseVisitorParamPairs,
  sanitizeVisitorCountry,
  sanitizeVisitorPath,
  sanitizeVisitorQuery,
  sanitizeVisitorReferrer,
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
});

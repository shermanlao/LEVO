import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { safeHttpUrl, safePublicHref } from './safe-href';

describe('safe hrefs', () => {
  it('allows http(s) only for external links', () => {
    assert.equal(safeHttpUrl('https://example.com/x'), 'https://example.com/x');
    assert.equal(safeHttpUrl('javascript:alert(1)'), null);
    assert.equal(safeHttpUrl('/products'), null);
  });

  it('allows same-site paths for public CTAs', () => {
    assert.equal(safePublicHref('/products'), '/products');
    assert.equal(safePublicHref('//evil.example'), null);
    assert.equal(safePublicHref('../etc/passwd'), null);
  });
});

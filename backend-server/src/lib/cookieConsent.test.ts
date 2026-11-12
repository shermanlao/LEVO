import assert from 'node:assert/strict';
import { describe, it, afterEach } from 'node:test';
import { hashClientIp, isCookieChoice } from './cookieConsent';
import { normalizeClientIp } from './rateLimit';

const previous = process.env.ADMIN_SESSION_SECRET;

describe('cookie consent ip hash', () => {
  afterEach(() => {
    if (previous === undefined) delete process.env.ADMIN_SESSION_SECRET;
    else process.env.ADMIN_SESSION_SECRET = previous;
  });

  it('hashes the same IP to the same row key and does not keep the address', () => {
    process.env.ADMIN_SESSION_SECRET = 'test-session-secret';
    const ip = '203.0.113.10';
    const hash = hashClientIp(ip);
    assert.equal(hash, hashClientIp(ip));
    assert.equal(hash.length, 64);
    assert.equal(hash.includes(ip), false);
    assert.notEqual(hash, hashClientIp('203.0.113.11'));
    process.env.ADMIN_SESSION_SECRET = 'other-secret';
    assert.notEqual(hash, hashClientIp(ip));
  });

  it('accepts only all or necessary', () => {
    assert.equal(isCookieChoice('all'), true);
    assert.equal(isCookieChoice('necessary'), true);
    assert.equal(isCookieChoice('marketing'), false);
    assert.equal(isCookieChoice(''), false);
  });

  it('treats loopback addresses as one local IP', () => {
    assert.equal(normalizeClientIp('::1'), '127.0.0.1');
    assert.equal(normalizeClientIp('::ffff:127.0.0.1'), '127.0.0.1');
    assert.equal(normalizeClientIp('203.0.113.10'), '203.0.113.10');
  });
});

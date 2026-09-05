import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertSafeHttpUrl, isPrivateOrLocalIp } from './ssrf';

describe('ssrf host block', () => {
  it('flags loopback and RFC1918 IPs', () => {
    assert.equal(isPrivateOrLocalIp('127.0.0.1'), true);
    assert.equal(isPrivateOrLocalIp('10.1.2.3'), true);
    assert.equal(isPrivateOrLocalIp('172.16.0.1'), true);
    assert.equal(isPrivateOrLocalIp('192.168.0.1'), true);
    assert.equal(isPrivateOrLocalIp('8.8.8.8'), false);
  });

  it('rejects localhost and non-http schemes', () => {
    assert.throws(() => assertSafeHttpUrl('http://localhost/admin'), /not allowed/);
    assert.throws(() => assertSafeHttpUrl('javascript:alert(1)'), /Only http/);
    assert.doesNotThrow(() => assertSafeHttpUrl('https://lightx.synology.me/api'));
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  cookieIsSecure,
  createSessionValue,
  safeAdminNextPath,
  verifySessionValue,
} from './admin-session-cookie';

describe('HMAC admin session', () => {
  it('round-trips username, role, and epoch', async () => {
    const value = await createSessionValue('pat', 'admin', 3);
    const session = await verifySessionValue(value);
    assert.deepEqual(session, { username: 'pat', role: 'admin', epoch: 3 });
  });

  it('rejects a missing or tampered cookie', async () => {
    assert.equal(await verifySessionValue(undefined), null);
    const value = await createSessionValue('pat', 'operation', 0);
    const bad = `${value.slice(0, -2)}aa`;
    assert.equal(await verifySessionValue(bad), null);
  });

  it('rejects an expired cookie', async () => {
    const value = await createSessionValue('pat', 'admin', 0, Date.now() - 8 * 24 * 60 * 60 * 1000);
    assert.equal(await verifySessionValue(value), null);
  });

  it('allowlists admin next paths only', () => {
    assert.equal(safeAdminNextPath('/admin/users'), '/admin/users');
    assert.equal(safeAdminNextPath('https://evil.example/admin'), '/admin');
    assert.equal(safeAdminNextPath('/admin/../etc'), '/admin');
  });

  it('marks cookies Secure only for HTTPS public origins', () => {
    const prev = {
      COOKIE_SECURE: process.env.COOKIE_SECURE,
      SITE_ORIGIN: process.env.SITE_ORIGIN,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
      NODE_ENV: process.env.NODE_ENV,
    };
    try {
      delete process.env.COOKIE_SECURE;
      delete process.env.NEXT_PUBLIC_SITE_URL;
      process.env.SITE_ORIGIN = 'http://187.7.21.12';
      process.env.NODE_ENV = 'production';
      assert.equal(cookieIsSecure(), false);
      process.env.SITE_ORIGIN = 'https://levo.example.com';
      assert.equal(cookieIsSecure(), true);
      process.env.COOKIE_SECURE = 'false';
      assert.equal(cookieIsSecure(), false);
    } finally {
      for (const [key, value] of Object.entries(prev)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});

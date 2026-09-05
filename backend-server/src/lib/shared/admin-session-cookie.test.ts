import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
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
    const value = await createSessionValue('pat', 'staff', 0);
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
});

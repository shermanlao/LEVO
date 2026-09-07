import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canManageUsers,
  defaultPagesForRole,
  migrateStoredRole,
  pageKeyForAdminPath,
  pageKeyForBackendPath,
  roleCanOpenPage,
  sanitizeRolePages,
} from './admin-roles';

describe('admin roles and page access', () => {
  it('maps leftover staff to operation and keeps admin', () => {
    assert.equal(migrateStoredRole('staff'), 'operation');
    assert.equal(migrateStoredRole('admin'), 'admin');
    assert.equal(migrateStoredRole('system'), 'system');
    assert.equal(migrateStoredRole('nope'), 'operation');
  });

  it('locks users and page access on for system and off for operation', () => {
    assert.deepEqual(sanitizeRolePages('system', ['catalog']), [
      'catalog',
      'users',
      'permissions',
    ]);
    assert.deepEqual(sanitizeRolePages('operation', ['catalog', 'users', 'permissions']), [
      'catalog',
    ]);
    assert.equal(roleCanOpenPage('operation', 'users', ['users']), false);
    assert.equal(roleCanOpenPage('system', 'users', []), true);
    assert.equal(canManageUsers('admin'), true);
    assert.equal(canManageUsers('operation'), false);
  });

  it('maps admin paths and backend prefixes to page keys', () => {
    assert.equal(pageKeyForAdminPath('/admin'), null);
    assert.equal(pageKeyForAdminPath('/admin/users'), 'users');
    assert.equal(pageKeyForAdminPath('/admin/users/access'), 'permissions');
    assert.equal(pageKeyForAdminPath('/admin/product-series/12'), 'catalog');
    assert.equal(pageKeyForAdminPath('/admin/external-catalog'), 'lightx');
    assert.equal(pageKeyForBackendPath('product-series/3'), 'catalog');
    assert.equal(pageKeyForBackendPath('projects/9'), 'projects');
    assert.ok(defaultPagesForRole('operation').includes('catalog'));
    assert.ok(!defaultPagesForRole('operation').includes('users'));
  });
});

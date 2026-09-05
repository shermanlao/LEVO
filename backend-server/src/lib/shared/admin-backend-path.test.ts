import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  METHOD_NOT_ALLOWED_STATUS,
  UNAUTHORIZED_STATUS,
  isAllowedAdminBackendPath,
  isPublicCatalogReadMethod,
} from './admin-backend-path';

describe('admin BFF and public catalog methods', () => {
  it('allowlists catalog write prefixes only', () => {
    assert.equal(isAllowedAdminBackendPath('products/12'), true);
    assert.equal(isAllowedAdminBackendPath('upload'), true);
    assert.equal(isAllowedAdminBackendPath('admin-users'), false);
    assert.equal(isAllowedAdminBackendPath('../etc'), false);
  });

  it('public catalog mutations are 405; missing admin cookie is 401', () => {
    assert.equal(isPublicCatalogReadMethod('GET'), true);
    assert.equal(isPublicCatalogReadMethod('POST'), false);
    assert.equal(METHOD_NOT_ALLOWED_STATUS, 405);
    assert.equal(UNAUTHORIZED_STATUS, 401);
  });
});

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_INTERNAL_API_SECRET,
  DEFAULT_SESSION_SECRET,
  productionSecretErrors,
} from './production-secrets';

describe('productionSecretErrors', () => {
  it('allows local defaults outside production', () => {
    assert.deepEqual(productionSecretErrors({ NODE_ENV: 'development' }), []);
  });

  it('rejects missing and default secrets in production', () => {
    const errors = productionSecretErrors({
      NODE_ENV: 'production',
      ADMIN_SESSION_SECRET: DEFAULT_SESSION_SECRET,
      AI_SETTINGS_ENCRYPTION_KEY: '',
      INTERNAL_API_SECRET: DEFAULT_INTERNAL_API_SECRET,
    });
    assert.equal(errors.length, 3);
  });

  it('accepts non-default production secrets', () => {
    assert.deepEqual(
      productionSecretErrors({
        NODE_ENV: 'production',
        ADMIN_SESSION_SECRET: 'long-random-session',
        AI_SETTINGS_ENCRYPTION_KEY: 'long-random-ai',
        INTERNAL_API_SECRET: 'long-random-internal',
      }),
      []
    );
  });
});

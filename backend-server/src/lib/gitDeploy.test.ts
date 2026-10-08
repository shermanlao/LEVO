import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseGitRef, sanitizeRemoteUrl } from './gitDeploy';

describe('git deploy refs', () => {
  it('accepts branch names and SHAs', () => {
    assert.equal(parseGitRef('main'), 'main');
    assert.equal(parseGitRef('feature/fix-cards'), 'feature/fix-cards');
    assert.equal(parseGitRef('177fd5e'), '177fd5e');
    assert.equal(parseGitRef('  v1.2.3  '), 'v1.2.3');
  });

  it('rejects shell metacharacters and traversal', () => {
    assert.equal(parseGitRef(''), null);
    assert.equal(parseGitRef('-n'), null);
    assert.equal(parseGitRef('main; rm -rf /'), null);
    assert.equal(parseGitRef('foo..bar'), null);
    assert.equal(parseGitRef('origin/HEAD$(id)'), null);
    assert.equal(parseGitRef('main && reboot'), null);
    assert.equal(parseGitRef('main\nreboot'), null);
  });

  it('strips credentials from https remotes', () => {
    assert.equal(
      sanitizeRemoteUrl('https://user:token@github.com/shermanlao/LEVO.git'),
      'https://github.com/shermanlao/LEVO.git'
    );
    assert.equal(
      sanitizeRemoteUrl('git@github.com:shermanlao/LEVO.git'),
      'git@github.com:shermanlao/LEVO.git'
    );
  });
});

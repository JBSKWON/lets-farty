import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { runChecks } from '../verify.mjs';
import { withRepository } from './fixtures.mjs';

test('runner accepts a successful child', async () => {
  assert.equal(await runChecks([[process.execPath, '-e', 'process.exit(0)']], process.cwd()), 0);
});
test('runner fails on child failure and does not execute later commands', async () => {
  await withRepository({}, async root => {
    const marker = join(root, 'should-not-exist');
    assert.equal(await runChecks([
      [process.execPath, '-e', 'process.exit(7)'],
      [process.execPath, '-e', `require('fs').writeFileSync(${JSON.stringify(marker)}, '')`],
    ], root), 1);
    assert.equal(existsSync(marker), false);
  });
});
test('runner reports missing executable as failure', async () => {
  assert.equal(await runChecks([['this-executable-does-not-exist-layering']], process.cwd()), 1);
});
test('fixture helper writes files and cleans up after success', async () => {
  let directory;
  await withRepository({'nested/file.txt': 'data'}, async root => {
    directory = root;
    assert.ok(existsSync(join(root, 'nested/file.txt')));
  });
  assert.equal(existsSync(directory), false);
});
test('fixture helper cleans up after a thrown error', async () => {
  let directory;
  await assert.rejects(withRepository({}, async root => {
    directory = root;
    throw new Error('expected callback failure');
  }), /expected callback failure/);
  assert.equal(existsSync(directory), false);
});

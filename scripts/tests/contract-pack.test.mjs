import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));
test('packed public subpaths support independent ESM, CommonJS and TypeScript consumers', async () => {
  await readFile(new URL('../../packages/contracts/package.json', import.meta.url));
  const result = spawnSync(process.execPath, ['scripts/verify-contract-pack.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

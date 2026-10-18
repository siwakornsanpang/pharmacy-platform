import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));
test('packed neutral HTTP supports independent public ESM, CommonJS and TypeScript consumers', () => {
  const result = spawnSync(process.execPath, ['scripts/verify-http-pack.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

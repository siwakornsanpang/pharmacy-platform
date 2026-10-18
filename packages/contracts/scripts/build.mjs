import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
rmSync(new URL('../dist/', import.meta.url), { recursive: true, force: true });
for (const format of ['esm', 'cjs']) {
  const result = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', `tsconfig.${format}.json`], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
  mkdirSync(new URL(`../dist/${format}/`, import.meta.url), { recursive: true });
  writeFileSync(new URL(`../dist/${format}/package.json`, import.meta.url), JSON.stringify({ type: format === 'esm' ? 'module' : 'commonjs' }) + '\n');
}

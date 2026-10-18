import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
const script = fileURLToPath(new URL('../check-boundaries.mjs', import.meta.url));

test('boundary checker rejects private and cross-app imports and server clients', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pharmacy-boundaries-'));
  try {
    for (const name of ['backend-api', 'backoffice', 'pharmacy-web']) await mkdir(join(root, 'apps', name, 'src'), { recursive: true });
    await mkdir(join(root, 'packages/contracts/src'), { recursive: true });
    await writeFile(join(root, 'apps/backoffice/src/valid.ts'), "import { CAPABILITY } from '@pharmacy/contracts/access';\n");
    const check = () => spawnSync(process.execPath, [script, root], { encoding: 'utf8' });
    assert.equal(check().status, 0);
    for (const [file, source, reason] of [
      ['apps/backoffice/src/invalid.ts', "import '../../backend-api/src/db';", 'cross-app'],
      ['apps/pharmacy-web/src/invalid.ts', "export * from 'drizzle-orm';", 'server client'],
      ['packages/contracts/src/invalid.ts', "const db = require('pg');", 'server client'],
      ['apps/backoffice/src/invalid.ts', "import('@pharmacy/contracts/src/access');", 'private contracts'],
      ['apps/backoffice/src/invalid.ts', "import '../../../packages/contracts/src/access';", 'private contracts'],
    ]) {
      const path = join(root, file);
      await writeFile(path, source);
      const result = check();
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, new RegExp(reason));
      await rm(path);
    }
    await writeFile(join(root, 'apps/backoffice/tsconfig.json'), JSON.stringify({ compilerOptions: { paths: { '@backend/*': ['../backend-api/src/*'] } } }));
    await writeFile(join(root, 'apps/backoffice/src/invalid.ts'), "import '@backend/db';");
    assert.equal(check().status, 1);
  } finally { await rm(root, { recursive: true, force: true }); }
});

async function withFixture(run) {
  const root = await mkdtemp(join(tmpdir(), 'pharmacy-boundary-regression-'));
  try {
    await mkdir(join(root, 'apps/backoffice/src'), { recursive: true });
    await run(root, () => spawnSync(process.execPath, [script, root], { encoding: 'utf8' }));
  } finally { await rm(root, { recursive: true, force: true }); }
}

test('boundary checker rejects cross-app package subpaths', async () => {
  await withFixture(async (root, check) => {
    const file = join(root, 'apps/backoffice/src/import.ts');
    for (const name of ['backend-api/src/db/index', 'pharmacy-web/lib/api']) {
      await writeFile(file, `import '${name}';`);
      const result = check();
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /cross-app import/);
    }
    await writeFile(file, "import 'back-office/src/config'; import 'backend-api-tools';");
    const allowed = check();
    assert.equal(allowed.status, 0, allowed.stdout + allowed.stderr);
  });
});

test('boundary checker resolves inherited aliases relative to their declaring config', async () => {
  await withFixture(async (root, check) => {
    await mkdir(join(root, 'configs'), { recursive: true });
    await writeFile(join(root, 'configs/tsconfig.base.json'), JSON.stringify({ compilerOptions: { paths: { '@backend/*': ['../apps/backend-api/src/*'] } } }));
    await writeFile(join(root, 'apps/backoffice/tsconfig.json'), JSON.stringify({ extends: '../../configs/tsconfig.base.json' }));
    await writeFile(join(root, 'apps/backoffice/src/invalid.ts'), "import '@backend/db/index';");
    const result = check();
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /cross-app import/);
  });
});

test('boundary checker rejects server clients required with static template literals', async () => {
  await withFixture(async (root, check) => {
    for (const source of ['const db = require(`pg`);', 'import(`pg`);']) {
      await writeFile(join(root, 'apps/backoffice/src/invalid.ts'), source);
      const result = check();
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stderr, /server client import/);
    }
  });
});

test('http shared core stays neutral and public-only across package boundaries', async () => {
  await withFixture(async (root, check) => {
    await mkdir(join(root, 'packages/http/src'), { recursive: true });
    await mkdir(join(root, 'packages/contracts/src'), { recursive: true });
    const app = join(root, 'apps/backoffice/src/import.ts');
    const core = join(root, 'packages/http/src/index.ts');
    await writeFile(app, "import { apiPath } from '@pharmacy/http';");
    await writeFile(core, 'export const size = 4000000;');
    assert.equal(check().status, 0);
    for (const source of ["import '@pharmacy/http/src/index';", "import '../../../packages/http/src/index';", "import '@pharmacy/http/dist/esm/index';"]) {
      await writeFile(app, source);
      const result = check(); assert.equal(result.status, 1, result.stdout + result.stderr); assert.match(result.stderr, /private http import/);
    }
    await rm(app);
    for (const source of ["import 'next/headers';", "import 'node:fs';", "import '@pharmacy/contracts/access';", "import '../../../apps/backoffice/src/lib/config/server';"]) {
      await writeFile(core, source);
      const result = check(); assert.equal(result.status, 1, result.stdout + result.stderr);
    }
    await writeFile(core, 'export const size = 4000000;');
    await writeFile(join(root, 'packages/contracts/src/index.ts'), "import '@pharmacy/http';");
    assert.equal(check().status, 1, 'contracts cannot gain HTTP I/O dependencies');
  });
});

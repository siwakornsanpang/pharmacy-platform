import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const consumer = await mkdtemp(join(tmpdir(), 'pharmacy-http-consumer-'));
function run(command, args, cwd = consumer) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', env: { ...process.env, npm_config_update_notifier: 'false', npm_config_cache: join(consumer, '.npm-cache') } });
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stdout}${result.stderr}`);
  return result.stdout;
}
try {
  const [pack] = JSON.parse(run('npm', ['pack', './packages/http', '--json', '--ignore-scripts', '--pack-destination', consumer], root));
  for (const format of ['esm', 'cjs']) {
    for (const file of ['index.js', 'index.d.ts', 'package.json']) assert.ok(pack.files.some(({ path }) => path === `dist/${format}/${file}`), `Missing ${format}/${file}; build shared first`);
  }
  for (const { path } of pack.files) assert.ok(path === 'package.json' || /^dist\/(esm|cjs)\/(?:index\.(?:js|d\.ts)|package\.json)$/.test(path), `Unexpected artifact: ${path}`);
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ name: 'independent-http-consumer', private: true, type: 'module' }));
  run('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', join(consumer, pack.filename)]);
  const behavior = `
assert.equal(http.apiPath('/api/roles/editor%40east'), '/roles/editor%40east');
assert.throws(() => http.apiPath('/%252e%252e'), http.ApiError);
assert.equal(http.isAddressableSegment('a/b'), false);
`;
  await writeFile(join(consumer, 'import.mjs'), `import assert from 'node:assert/strict';\nimport * as http from '@pharmacy/http';\n${behavior}\nawait assert.rejects(import('@pharmacy/http/src/index'), {code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});\n`);
  await writeFile(join(consumer, 'require.cjs'), `const assert = require('node:assert/strict');\nconst http = require('@pharmacy/http');\n${behavior}\nassert.throws(()=>require('@pharmacy/http/dist/cjs/index'), {code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});\n`);
  run(process.execPath, ['import.mjs']);
  run(process.execPath, ['require.cjs']);
  const types = `
import { apiPath, nativeRequest, decodeResponse, type ApiOptions } from '@pharmacy/http';
const options: ApiOptions = {method:'POST', body:'{}', timeoutMs:100, signal:new AbortController().signal};
const result: Promise<{ok:boolean}> = nativeRequest('https://fixture.test/api/x', options, 'omit', decodeResponse<{ok:boolean}>);
const path: string = apiPath('/x');
// @ts-expect-error Domain authority is app-local, never an HTTP core option.
const actor: ApiOptions = {staffToken:'no-core-domain-authority'};
// @ts-expect-error Private source is not exported.
import * as source from '@pharmacy/http/src/index';
`;
  for (const ext of ['mts', 'cts']) {
    await writeFile(join(consumer, `consumer.${ext}`), types);
    run(process.execPath, [require.resolve('typescript/bin/tsc'), '--strict', '--noEmit', '--target', 'ES2022', '--module', ext === 'cts' ? 'Node16' : 'NodeNext', '--moduleResolution', ext === 'cts' ? 'Node16' : 'NodeNext', `consumer.${ext}`]);
  }
  const manifest = JSON.parse(await readFile(join(consumer, 'node_modules/@pharmacy/http/package.json'), 'utf8'));
  assert.deepEqual(Object.keys(manifest.exports), ['.']);
  assert.deepEqual(manifest.dependencies ?? {}, {});
  console.log('Packed HTTP: public root passed ESM, CommonJS, both TypeScript consumers and private-export denials.');
} finally { await rm(consumer, { recursive: true, force: true }); }

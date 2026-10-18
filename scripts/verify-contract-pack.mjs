import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const consumer = await mkdtemp(join(tmpdir(), 'pharmacy-contract-consumer-'));
const subpaths = ['access', 'content', 'registry', 'academy', 'media'];
function run(command, args, cwd = consumer) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', env: { ...process.env, npm_config_update_notifier: 'false', npm_config_cache: join(consumer, '.npm-cache') } });
  assert.equal(result.status, 0, `${command} ${args.join(' ')}\n${result.stdout}${result.stderr}`);
  return result.stdout;
}
try {
  const [pack] = JSON.parse(run('npm', ['pack', './packages/contracts', '--json', '--ignore-scripts', '--pack-destination', consumer], root));
  assert.ok(pack.files.some(({ path }) => path === 'dist/esm/access.js'), 'Build contracts before verifying the pack');
  for (const { path } of pack.files) {
    assert.ok(path === 'package.json' || /^dist\/(esm|cjs)\/(?:(?:content\/)?[a-z]+\.(?:js|d\.ts)|package\.json)$/.test(path), `Unexpected artifact: ${path}`);
  }
  await writeFile(join(consumer, 'package.json'), JSON.stringify({ name: 'independent-consumer', private: true, type: 'module' }));
  run('npm', ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', join(consumer, pack.filename)]);
  for (const { path } of pack.files.filter(({ path }) => /\.(?:js|d\.ts)$/.test(path))) {
    const source = await readFile(join(consumer, 'node_modules/@pharmacy/contracts', path), 'utf8');
    for (const match of source.matchAll(/(?:from\s+|require\s*\(|import\s*\()(['"])([^'"]+)\1/g)) {
      assert.ok(match[2].startsWith('./') || match[2].startsWith('../'), `External packed import: ${path}: ${match[2]}`);
      assert.ok(!/(?:apps|node_modules|src)\//.test(match[2]), `Private packed import: ${path}: ${match[2]}`);
    }
  }
  const publicImports = subpaths.map((name) => `import * as ${name} from '@pharmacy/contracts/${name}';`).join('\n');
  const contentFamilies = ['HomeContent','PharmacistHomeContent','News','Medicine','PublicProject','Law','Council','History','Agency','WebSettings','HonorAward','Honor','Service','PolicyCategory','PolicyProject','Product','OtherServiceCategory','OtherServiceItem'];
  const contentTypes = contentFamilies.flatMap(name => ['Public','AdminSummary','AdminDetail'].map(projection => `${name}${projection}`));
  const behavior = "assert.equal(access.CAPABILITY.MANAGE_ACADEMY, 'manage_academy'); assert.equal(access.isPermissionKey('made_up'), false); assert.equal(content.NewsPublicSummarySchema.additionalProperties, false); assert.equal('content' in content.NewsPublicSummarySchema.properties, false); assert.equal(content.NewsPublicDetailSchema.properties.content.type, 'string'); assert.equal(content.ProductAdminDetailSchema.properties.price.type, 'string'); assert.equal(content.isContentDate('2024-02-29'), true); assert.equal(content.isContentDate('2025-02-29'), false); const sources = content.validateContentImageSources([{origin:'https://app.example.test',pathPrefix:'/media/'}]); assert.equal(content.isContentImage('/media/a.png',sources),true); assert.equal(content.resolveContentImage('/media/a.png',sources),'https://app.example.test/media/a.png'); assert.equal(content.resolveContentImage('/media/%70rivate/a.png',sources),null); assert.equal(content.resolveContentImage('/media/%2570rivate/a.png',sources),null); assert.equal(content.isContentImage('https://other.example.test/media/a.png',sources),false); assert.equal(content.contentGoogleMapsEmbedUrl('https://www.google.com/maps/embed?pb=fixture'),'https://www.google.com/maps/embed?pb=fixture'); assert.equal(content.contentGoogleMapsEmbedUrl('https://evil.test/maps/embed?pb=fixture'),null);" + `\nfor (const name of ${JSON.stringify(contentTypes)}) assert.equal(content[name + 'Schema'].additionalProperties, false, name);`;
  await writeFile(join(consumer, 'import.mjs'), `import assert from 'node:assert/strict';\n${publicImports}\n${behavior}\n`);
  await writeFile(join(consumer, 'require.cjs'), `const assert = require('node:assert/strict');\n${subpaths.map((name) => `const ${name} = require('@pharmacy/contracts/${name}');`).join('\n')}\n${behavior}\n`);
  run(process.execPath, ['import.mjs']);
  run(process.execPath, ['require.cjs']);
  const typeChecks = `
import type { ${contentTypes.join(', ')} } from '@pharmacy/contracts/content';
import type { CapabilityDefinition, PermissionKey, StaffIdentity } from '@pharmacy/contracts/access';
const key: PermissionKey = access.CAPABILITY.MANAGE_ACADEMY;
const catalog: readonly CapabilityDefinition[] = access.capabilityCatalog;
const staff: StaffIdentity = { id: 1, username: 'test', displayName: 'Test', role: 'editor', permissions: [key] };
import type { NewsPublicSummary, ContentListQuery, Page } from '@pharmacy/contracts/content';
const list: ContentListQuery = { page: 1, pageSize: 10, category: 'news' };
const result: Page<NewsPublicSummary> = { items: [], total: 0, page: 1, pageSize: 10 };
const home: HomeContentAdminDetail = { id: null, revision: 0, banners: [], popups: [], updatedAt: null };
// @ts-expect-error Decimal price is a string on the wire.
const price: ProductPublic['price'] = 12.34;
// @ts-expect-error Public list projection excludes HTML.
const body: NewsPublicSummary['content'] = '';
import type { GoogleMapsEmbedUrl } from '@pharmacy/contracts/content';
const embed: GoogleMapsEmbedUrl | null = content.contentGoogleMapsEmbedUrl('https://www.google.com/maps/embed?pb=fixture');
// @ts-expect-error Arbitrary strings cannot claim validated embed identity.
const rawEmbed: GoogleMapsEmbedUrl = 'https://evil.test';
// @ts-expect-error Internal focused content modules are not public subpaths.
import * as privateContent from '@pharmacy/contracts/content/articles';
const input: unknown = 'manage_academy';
if (access.isPermissionKey(input)) { const valid: PermissionKey = input; }
// @ts-expect-error Unknown keys must not typecheck.
const invalid: PermissionKey = 'made_up';
// @ts-expect-error Internal source is not exported.
import * as internal from '@pharmacy/contracts/src/access';
`;
  for (const ext of ['mts', 'cts']) {
    await writeFile(join(consumer, `consumer.${ext}`), publicImports + typeChecks);
    run(process.execPath, [require.resolve('typescript/bin/tsc'), '--strict', '--noEmit', '--target', 'ES2022', '--module', ext === 'cts' ? 'Node16' : 'NodeNext', '--moduleResolution', ext === 'cts' ? 'Node16' : 'NodeNext', `consumer.${ext}`]);
  }
  // The installed artifact exposes only built output, never source or environment files.
  const manifest = JSON.parse(await readFile(join(consumer, 'node_modules/@pharmacy/contracts/package.json'), 'utf8'));
  assert.deepEqual(Object.keys(manifest.exports).sort(), subpaths.map((name) => `./${name}`).sort());
  console.log('Packed contracts: 5 subpaths passed ESM, CommonJS and both TypeScript consumers.');
} finally {
  await rm(consumer, { recursive: true, force: true });
}

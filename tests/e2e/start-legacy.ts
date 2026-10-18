import { spawn } from 'node:child_process';
import { cpSync, mkdirSync, symlinkSync, existsSync, readFileSync, writeFileSync, appendFileSync, rmSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { startFixtureServer } from '../fixtures/server';

async function main() {
  const root = process.cwd();
  const output = resolve('.superpowers/ui-baseline');
  mkdirSync(output, { recursive: true });
  for (const name of ['egress', 'fixture-requests']) writeFileSync(resolve(output, `${name}.jsonl`), '');
  process.env.OFFLINE_FIXTURE_LOG = resolve(output, 'fixture-requests.jsonl');
  const fixture = await startFixtureServer(4319);
  const children: ReturnType<typeof spawn>[] = [];
  let stopping = false;
  const stop = async () => { if (stopping) return; stopping = true; for (const child of children) child.kill('SIGTERM'); await fixture.close(); };
  process.once('SIGTERM', () => void stop()); process.once('SIGINT', () => void stop());
  const assets = JSON.parse(readFileSync('tests/fixtures/assets/manifest.json', 'utf8'));
  for (const file of assets.assets) {
    if (createHash('sha256').update(readFileSync(resolve('tests/fixtures/assets', file.path))).digest('hex') !== file.sha256) throw new Error(`Asset changed: ${file.path}`);
  }
  for (const [name, port, manifestFile] of [['backoffice', 4320, 'legacy-source-manifest.json'], ['pharmacy', 4321, 'legacy-pharmacy-source-manifest.json']] as const) {
    const snapshot = resolve(`tests/fixtures/legacy-${name}`);
    const manifest = JSON.parse(readFileSync(resolve('tests/fixtures', manifestFile), 'utf8'));
    for (const file of manifest.files) {
      if (createHash('sha256').update(readFileSync(resolve(snapshot, file.path))).digest('hex') !== file.sha256) throw new Error(`Legacy source changed: ${name}/${file.path}`);
    }
    const app = resolve(output, name);
    rmSync(app, { recursive: true, force: true });
    cpSync(snapshot, app, { recursive: true });
    if (!existsSync(resolve(app, 'node_modules'))) symlinkSync(resolve('node_modules'), resolve(app, 'node_modules'), 'dir');
    // Transport-only overlay: same JSX/CSS/routes/auth, no live rewrites or image optimizer egress.
    appendFileSync(resolve(app, 'next.config.ts'), `\nnextConfig.images = { ...nextConfig.images, dangerouslyAllowLocalIP: true, remotePatterns: [{ protocol: "http", hostname: "127.0.0.1", port: "4319", pathname: "/assets/**" }] };\nnextConfig.experimental = { cpus: 2 };\nnextConfig.outputFileTracingRoot = ${JSON.stringify(root)};\n`);
    if (name === 'pharmacy') appendFileSync(resolve(app, 'next.config.ts'), '\nconst originalRewrites = nextConfig.rewrites!;\nnextConfig.rewrites = async () => { const rules = await originalRewrites(); if ("beforeFiles" in rules) rules.beforeFiles = rules.beforeFiles?.map(rule => rule.source === "/api/proxy/:path*" ? { ...rule, destination: "http://127.0.0.1:4319/:path*" } : rule); return rules; };\n');
    const env = { ...process.env, TZ: 'Asia/Bangkok', NEXT_TELEMETRY_DISABLED: '1', NEXT_PUBLIC_API_URL: fixture.origin, CONFERENCE_API_URL: fixture.origin,
      NEXT_FONT_GOOGLE_MOCKED_RESPONSES: resolve('tests/e2e/font-responses.cjs'),
      NODE_OPTIONS: `--require=${resolve('tests/e2e/offline-guard.cjs')}`, OFFLINE_FIXED_CLOCK: '2026-10-14T00:00:00Z', OFFLINE_EGRESS_LOG: resolve(output, 'egress.jsonl') };
    const run = (args: string[]) => {
      const child = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), ...args], { cwd: app, env, stdio: 'inherit' });
      children.push(child); return child;
    };
    const build = run(['build', '--webpack']);
    const code = await new Promise(resolve => build.once('exit', resolve));
    if (code !== 0) { await stop(); process.exit(1); }
    const builtFonts = new Set(readdirSync(resolve(app, '.next/static/media')).filter(p => p.endsWith('.woff2')).map(p => createHash('sha256').update(readFileSync(resolve(app, '.next/static/media', p))).digest('hex')));
    const fontCSS = (name === 'backoffice' ? ['kanit.css'] : ['kanit.css', 'geist.css', 'geist_mono.css']).map(p => readFileSync(resolve('tests/fixtures/assets', p), 'utf8')).join('');
    const expectedFonts = new Set([...fontCSS.matchAll(/fonts\/([a-f0-9]{64})\.woff2/g)].map(m => m[1]));
    if (builtFonts.size !== expectedFonts.size || [...expectedFonts].some(hash => !builtFonts.has(hash))) throw new Error(`Generated font bytes differ: ${name} ${builtFonts.size}/${expectedFonts.size}`);
    const server = run(['start', '--hostname', '127.0.0.1', '--port', String(port)]);
    server.once('exit', async code => { if (!stopping) { await stop(); process.exit(code ?? 1); } });
  }
}
main().catch(error => { console.error(error); process.exit(1); });

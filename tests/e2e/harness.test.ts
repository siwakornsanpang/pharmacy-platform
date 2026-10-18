import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { startFixtureServer } from '../fixtures/server';

test('fixture server rejects unknown reads and writes without forwarding', async () => {
  const server = await startFixtureServer();
  try {
    assert.equal((await fetch(`${server.origin}/news`)).status, 200);
    assert.equal((await fetch(`${server.origin}/unknown`)).status, 501);
    assert.equal((await fetch(`${server.origin}/news`, { method: 'POST' })).status, 500);
    assert.equal((await fetch(`${server.origin}/unknown`, { method: 'POST' })).status, 501);
  } finally { await server.close(); }
});

test('server guard blocks external fetch and raw sockets before network access', () => {
  for (const source of [
    "fetch('https://example.com').catch(e=>{console.error(e.message);process.exit(23)})",
    "require('node:net').connect(443,'example.com')",
    "require('node:https').get('https://example.com')",
  ]) {
    const result = spawnSync(process.execPath, ['--require', './tests/e2e/offline-guard.cjs', '-e', source], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /OFFLINE_EGRESS_BLOCKED/);
  }
});

test('manifest activates both apps with concrete valid examples and critical captures', async () => {
  const { routeManifest } = await import('./route-manifest');
  assert.equal(routeManifest.filter(c => c.pending).length, 0);
  for (const app of ['backoffice', 'pharmacy']) {
    const cases = routeManifest.filter(c => c.app === app);
    assert.ok(cases.filter(c => c.captureScreenshot).length >= 13, `${app} needs critical screenshots`);
    assert.ok(cases.every(c => !c.route.includes('[') && c.viewport === 'both'));
  }
  assert.ok(routeManifest.some(c => c.route.includes('sap-33/apply')));
  assert.ok(routeManifest.some(c => c.route.includes('success?orderId=')));
  assert.ok(routeManifest.some(c => c.state === 'public-auth'));
  assert.ok(routeManifest.some(c => c.state === 'mock-login'));
  assert.ok(routeManifest.some(c => c.state === 'conference'));
});

test('offline font CSS keeps exact families and every captured font byte', async () => {
  const { readFileSync } = await import('node:fs');
  for (const [file, family, count] of [['kanit.css', 'Kanit', 16], ['geist.css', 'Geist', 5], ['geist_mono.css', 'Geist Mono', 6]] as const) {
    const css = readFileSync(`tests/fixtures/assets/${file}`, 'utf8');
    assert.equal((css.match(/@font-face/g) || []).length, count);
    assert.ok([...css.matchAll(/font-family:\s*([^;]+);/g)].every(match => match[1] === family), file);
  }
});

test('raw server sockets reject unlisted loopback ports without touching a peer', () => {
  const source = "require('node:net').Socket.prototype.connect=function(){throw new Error('WOULD_CONNECT_WITHOUT_NETWORK')};require('./tests/e2e/offline-guard.cjs');require('node:net').connect(8080,'127.0.0.1')";
  const result = spawnSync(process.execPath, ['-e', source], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /OFFLINE_EGRESS_BLOCKED/);
  assert.doesNotMatch(result.stderr, /Error: WOULD_CONNECT_WITHOUT_NETWORK/);
});

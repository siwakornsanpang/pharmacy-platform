import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import academy from '../fixtures/academy.json';
import conference from '../fixtures/conference.json';
import { routeManifest } from './route-manifest';

const root = resolve(__dirname, '../..');
function source(path: string) {
  return readFileSync(resolve(root, path), 'utf8');
}

test('academy and conference fixtures stay isolated from member session cookies', () => {
  assert.ok(Object.keys(academy).some(key => key.startsWith('/academy/')));
  assert.ok(Object.keys(academy).includes('/api/academy/enrollments'));
  assert.ok(Object.keys(conference).every(key => key.startsWith('/api/conference/')));
  assert.doesNotMatch(JSON.stringify(academy), /pharmacy_session|PHARMACY_SESSION_SECRET|CONFERENCE_API_URL/);
  assert.doesNotMatch(JSON.stringify(conference), /pharmacy_session|PHARMACY_SESSION_SECRET|staff JWT/);
});

test('public auth no longer gates children on /me', () => {
  const auth = source('apps/pharmacy-web/context/AuthContext.tsx');
  assert.match(auth, /authReady: boolean/);
  assert.doesNotMatch(auth, /if \(!loaded\) return null/);
  assert.match(auth, /AUTH_TIMEOUT_MS = 10_000|setTimeout\(\(\) => controller.abort\(\), AUTH_TIMEOUT_MS\)/);
  const header = source('apps/pharmacy-web/components/ui/AppHeader.tsx');
  assert.match(header, /authReady && isLoggedIn \? <MemberNavbar \/> : <Navbar \/>/);
  const member = source('apps/pharmacy-web/features/member/api.ts');
  assert.doesNotMatch(member, /getServerConfig|DATABASE_URL|PHARMACY_SESSION_SECRET/);
});

test('visual grep contract includes academy, conference, public-auth, and mock-login', () => {
  const titles = routeManifest.map(item => `${item.app} ${item.route} ${item.state}`);
  const grep = /academy|conference|public-auth|mock-login/;
  assert.ok(titles.some(title => grep.test(title)));
  assert.ok(routeManifest.some(item => item.app === 'backoffice' && item.route.includes('/academy')));
  assert.ok(routeManifest.some(item => item.app === 'pharmacy' && item.state === 'public-auth'));
  assert.ok(routeManifest.some(item => item.app === 'pharmacy' && item.state === 'mock-login'));
  assert.ok(routeManifest.some(item => item.app === 'pharmacy' && item.state === 'conference'));
  assert.equal(routeManifest.filter(item => item.pending).length, 0);
});

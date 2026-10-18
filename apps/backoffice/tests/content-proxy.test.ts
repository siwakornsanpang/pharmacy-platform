// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('server-only', () => ({}));
import { backendRoute } from '../src/lib/api/proxy-policy';
import { backendDomainRoutes } from '../src/lib/server/backend-domain-routes';
import { DELETE, GET, POST, PUT } from '../src/app/api/backend/[...path]/route';

const origin = 'https://app.example.test';
const csrf = 'a'.repeat(64);
const upstream = vi.fn<typeof fetch>();
const families = ['home-content', 'pharmacist-home-content', 'news', 'medicine', 'public-project', 'laws', 'council', 'history', 'agencies', 'web-settings', 'honor-awards', 'honor', 'services', 'policy-categories', 'policy-projects', 'products', 'other-service-categories', 'other-service-items'];
const singletons = ['home-content', 'pharmacist-home-content', 'web-settings'];
const articles = ['news', 'medicine', 'public-project', 'products'];
const categories = ['news', 'medicine', 'public-project', 'laws', 'agencies', 'honor', 'policy-projects', 'products', 'other-service-items'];
const statuses = ['news', 'medicine', 'public-project', 'laws', 'policy-projects', 'other-service-items'];

async function call(path: string, method = 'GET', headers: Record<string, string> = {}, body?: BodyInit) {
  const handlers: Record<string, typeof GET> = { GET, POST, PUT, DELETE };
  return handlers[method](new NextRequest(origin + '/api/backend' + path, {
    method,
    headers: { origin, cookie: `__Host-pharmacy_staff=secret; __Host-pharmacy_csrf=${csrf}`, 'x-csrf-token': csrf, ...headers },
    ...(body === undefined ? {} : { body }),
    ...(body instanceof ReadableStream ? { duplex: 'half' } : {}),
  } as ConstructorParameters<typeof NextRequest>[1]), { params: Promise.resolve({ path: path.split('?')[0].slice(1).split('/').map(decodeURIComponent) }) });
}

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('BACKEND_API_URL', 'https://backend.example.test');
  vi.stubEnv('BACKOFFICE_ORIGIN', origin);
  vi.stubEnv('ALLOW_LOCAL_UI_BYPASS', 'false');
  vi.stubGlobal('fetch', upstream);
  upstream.mockReset();
  upstream.mockResolvedValue(Response.json({ ok: true }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('keeps the finite Backoffice declarations staff-only across all 18 families', () => {
  expect(backendDomainRoutes).toHaveLength(207);
  for (const family of families) {
    expect(backendRoute('/admin/content/' + family, 'GET', new Headers()).actor).toBe('staff');
    expect(() => backendRoute('/' + family, 'GET', new Headers())).toThrow();
    expect(backendRoute('/' + family, 'POST', new Headers()).actor).toBe('staff');
    if (!singletons.includes(family)) expect(backendRoute('/admin/content/' + family + '/1', 'GET', new Headers()).actor).toBe('staff');
  }
  for (const path of ['/admin/content/news/upload-image', '/admin/content/services/popular', '/admin/content/policy-categories/with-count', '/admin/content/home-content/1', '/admin/content/web-settings/reorder', '/admin/content/news/1x', '/admin/content/news/0', '/admin/content/news/-1']) expect(() => backendRoute(path, 'GET', new Headers())).toThrow();
  for (const path of ['/admin/content/news/upload-image', '/unknown']) expect(() => backendRoute(path, 'POST', new Headers())).toThrow();
});

it('adds only canonical protected Registry GETs with finite query policy', async () => {
  expect(backendRoute('/admin/registry/pharmacists?q=x&province=Bangkok&status=active&page=1&pageSize=10&sort=name&direction=asc', 'GET', new Headers()).actor).toBe('staff');
  expect(backendRoute('/admin/registry/pharmacists/filters', 'GET', new Headers()).queryKeys).toEqual([]);
  expect(backendRoute('/admin/registry/pharmacists/1', 'GET', new Headers()).actor).toBe('staff');
  for (const path of ['/pharmacists', '/admin/registry/pharmacists?unknown=x', '/admin/registry/pharmacists/1?q=x', '/admin/registry/pharmacists/0'])
    expect(() => backendRoute(path, 'GET', new Headers())).toThrow();
  for (const method of ['POST', 'PUT', 'DELETE'])
    expect(() => backendRoute('/admin/registry/pharmacists', method, new Headers())).toThrow();
  const response = await call('/admin/registry/pharmacists/filters');
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(upstream.mock.calls[0][0]).toBe('https://backend.example.test/api/admin/registry/pharmacists/filters');
  expect(new Headers(upstream.mock.calls[0][1]?.headers).get('authorization')).toBe('Bearer secret');
});

it('adds finite Requests rules and forwards only a validated Idempotency-Key on mutations', async () => {
  const opaque = new URLSearchParams({ requestId: 'เลขที่/คำขอ-๑' }).toString();
  expect(backendRoute('/admin/registry/requests?status=draft&q=x', 'GET', new Headers()).actor).toBe('staff');
  expect(backendRoute(`/admin/registry/requests/detail?${opaque}`, 'GET', new Headers()).queryKeys).toEqual(['requestId']);
  expect(backendRoute(`/admin/registry/requests/payments?${opaque}`, 'GET', new Headers()).actor).toBe('staff');
  for (const [method, path] of [
    ['POST', '/admin/registry/requests'],
    ['PUT', `/admin/registry/requests/detail?${opaque}`],
    ['DELETE', `/admin/registry/requests/detail?${opaque}`],
    ['POST', `/admin/registry/requests/payments?${opaque}`],
    ['POST', '/requests'], ['PUT', '/requests/legacy-id'], ['DELETE', '/requests/legacy-id'],
    ['POST', '/requests/legacy-id/payment'],
  ]) {
    expect(backendRoute(path, method, new Headers({ 'Idempotency-Key': 'visible-key' })).forwardIdempotencyKey).toBe(true);
    expect(() => backendRoute(path, method, new Headers())).toThrow();
    expect(() => backendRoute(path, method, new Headers({ 'Idempotency-Key': 'has space' }))).toThrow();
  }
  for (const path of ['/admin/registry/requests?unknown=x', `/admin/registry/requests/detail?${opaque}&requestId=again`,
    '/admin/registry/requests/payments', '/requests/legacy/id',
    `/admin/registry/requests/detail?${new URLSearchParams({ requestId: 'x'.repeat(51) })}`,
    '/requests/' + 'x'.repeat(51)])
    expect(() => backendRoute(path, 'GET', new Headers())).toThrow();
  expect(() => backendRoute('/admin/registry/pharmacists', 'GET', new Headers({ 'Idempotency-Key': 'not-forwarded' }))).toThrow();
  expect(backendRoute('/media/11111111-1111-4111-8111-111111111111/download', 'GET', new Headers()).actor).toBe('staff');
  expect(() => backendRoute('/media/uploads/11111111-1111-4111-8111-111111111111', 'POST', new Headers())).toThrow();

  const response = await call('/admin/registry/requests', 'POST', {
    'content-type': 'application/json', 'Idempotency-Key': 'proxy-key',
  }, JSON.stringify({ id: 'request-1', pharmacistLicenseId: 'PHA-1' }));
  expect(response.status).toBe(200);
  const headers = new Headers(upstream.mock.calls[0][1]?.headers);
  expect(headers.get('idempotency-key')).toBe('proxy-key');
  expect(headers.get('authorization')).toBe('Bearer secret');
  for (const key of ['cookie', 'x-csrf-token', 'origin', 'x-actor-id']) expect(headers.get(key)).toBeNull();
});

it('enforces exact Backoffice query keys and rejects caller-controlled authority', () => {
  const cases = ['/admin/content/news?page=1&pageSize=10&q=x&category=news&status=published&sort=id&direction=asc', '/admin/content/honor?category=1', '/admin/content/policy-projects?category=1', '/admin/content/products?q=x', '/admin/content/services/reorder'];
  for (const path of cases) expect(backendRoute(path, path.endsWith('/reorder') ? 'PUT' : 'GET', new Headers()).actor).toBe('staff');
  for (const path of ['/admin/content/news?unknown=1', '/admin/content/news?category=a&category=b', '/admin/content/home-content?page=1', '/admin/content/products?awardId=1', '/admin/content/council?status=x', '/admin/content/news?search=x', '/admin/content/honor?awardId=1', '/admin/content/policy-projects?categoryId=1', '/admin/content/products?search=x', '/admin/content/services?category=x']) expect(() => backendRoute(path, 'GET', new Headers())).toThrow();
  for (const path of ['https://evil.test/news', '//evil.test/news', '/news/../home-content', '/%252e%252e/news', '/news%2f1']) expect(() => backendRoute(path, 'GET', new Headers())).toThrow();
  for (const header of ['authorization', 'x-actor-id', 'x-backend-url', 'x-user-role']) expect(() => backendRoute('/admin/content/news', 'GET', new Headers({ [header]: 'forged' }))).toThrow();
});

it('keeps the real Backoffice proxy bound to the staff session and JSON transport', async () => {
  const response = await call('/admin/content/news');
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(upstream.mock.calls[0][0]).toBe('https://backend.example.test/api/admin/content/news');
  expect(new Headers(upstream.mock.calls[0][1]?.headers).get('authorization')).toBe('Bearer secret');
  expect(new Headers(upstream.mock.calls[0][1]?.headers).get('cookie')).toBeNull();
  expect((await call('/admin/content/news', 'GET', { cookie: '' })).status).toBe(401);
  for (const header of [{ origin: '' }, { 'x-csrf-token': '' }] as Record<string, string>[]) expect((await call('/admin/content/home-content', 'POST', { 'content-type': 'application/json', ...header }, '{}')).status).toBe(403);
  for (const type of ['multipart/form-data; boundary=x', 'text/plain']) expect((await call('/admin/content/home-content', 'POST', { 'content-type': type }, 'broken')).status).toBe(415);
  expect((await call('/admin/content/home-content', 'POST', { 'content-type': 'application/json' }, '{broken')).status).toBe(400);
  upstream.mockResolvedValueOnce(Response.json({ message: 'Content unavailable' }, { status: 503 }));
  expect((await call('/admin/content/home-content', 'POST', { 'content-type': 'application/json' }, '{}')).status).toBe(503);
  expect(upstream).toHaveBeenCalledTimes(2);
  const empty = new ReadableStream<Uint8Array>({ start(controller) { controller.close(); } });
  upstream.mockResolvedValueOnce(Response.json({ success: true }));
  expect((await call('/laws/1', 'DELETE', {}, empty)).status).toBe(200);
  expect(upstream.mock.calls.at(-1)?.[0]).toBe('https://backend.example.test/api/laws/1');
});

it('enumerates every accepted Backoffice method/path with its exact query policy', () => {
  const expected: { method: string; path: string; keys: string[] }[] = [];
  for (const family of families) {
    expected.push({ method: 'GET', path: '/admin/content/' + family, keys: singletons.includes(family) ? [] : ['page', 'pageSize', 'q', ...(categories.includes(family) ? ['category'] : []), ...(statuses.includes(family) ? ['status'] : []), 'sort', 'direction'] });
    if (!singletons.includes(family)) expected.push({ method: 'GET', path: '/admin/content/' + family + '/1', keys: [] });
    for (const prefix of ['/admin/content/', '/']) {
      expected.push({ method: 'POST', path: prefix + family, keys: [] });
      if (!singletons.includes(family)) {
        expected.push({ method: 'PUT', path: prefix + family + '/1', keys: [] }, { method: 'DELETE', path: prefix + family + '/1', keys: [] });
        if (![...articles, 'history'].includes(family)) expected.push({ method: 'PUT', path: prefix + family + '/reorder', keys: [] });
      }
    }
    if (!['honor-awards', 'policy-categories', 'other-service-categories'].includes(family)) {
      expected.push({ method: 'POST', path: '/' + family + '/upload-image', keys: [] });
    }
  }
  expect(expected).toHaveLength(164);
  for (const route of expected) {
    const rule = backendRoute(route.path, route.method, new Headers());
    expect(rule.queryKeys, route.method + ' ' + route.path).toEqual(route.keys);
    expect(rule.actor).toBe('staff');
    expect(() => backendRoute(route.path + '?unexpected=1', route.method, new Headers())).toThrow();
    expect(() => backendRoute(route.path + '/extra', route.method, new Headers())).toThrow();
  }
});

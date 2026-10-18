// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('server-only', () => ({}));
import { backendRoute } from '../../lib/api/proxy-policy';
import { backendDomainRoutes } from '../../lib/server/backend-domain-routes';
import { DELETE, GET, POST, PUT } from '../../app/api/backend/[...path]/route';

const origin = 'https://app.example.test';
const csrf = 'a'.repeat(64);
const upstream = vi.fn<typeof fetch>();
const families = ['home-content', 'pharmacist-home-content', 'news', 'medicine', 'public-project', 'laws', 'council', 'history', 'agencies', 'web-settings', 'honor-awards', 'honor', 'services', 'policy-categories', 'policy-projects', 'products', 'other-service-categories', 'other-service-items'];
const articles = ['news', 'medicine', 'public-project', 'products'];
const publicKeys: Record<string, string[]> = { news: ['category', 'status'], medicine: ['status'], 'public-project': ['status'], honor: ['awardId'], 'policy-projects': ['categoryId'], products: ['category', 'search'] };

async function call(path: string, method = 'GET', headers: Record<string, string> = {}, body?: string) {
  const handlers: Record<string, typeof GET> = { GET, POST, PUT, DELETE };
  return handlers[method](new NextRequest(origin + '/api/backend' + path, {
    method,
    headers: { origin, cookie: `__Host-pharmacy_staff=secret; __Host-pharmacy_csrf=${csrf}`, 'x-csrf-token': csrf, ...headers },
    ...(body === undefined ? {} : { body }),
  }), { params: Promise.resolve({ path: path.split('?')[0].slice(1).split('/').map(decodeURIComponent) }) });
}

beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('BACKEND_API_URL', 'https://backend.example.test');
  vi.stubEnv('PHARMACY_WEB_ORIGIN', origin);
  vi.stubEnv('PHARMACY_SESSION_SECRET', 'fake-pharmacy-session-secret-at-least-32-ch');
  vi.stubEnv('ACADEMY_BRIDGE_KEY', 'fake-academy-secret');
  vi.stubEnv('CONFERENCE_API_URL', 'https://conference.example.test');
  vi.stubEnv('ALLOW_LOCAL_UI_BYPASS', 'false');
  vi.stubGlobal('fetch', upstream);
  upstream.mockReset();
  upstream.mockResolvedValue(Response.json({ ok: true }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

it('keeps the finite Pharmacy declarations public-only across all 18 families', () => {
  expect(backendDomainRoutes).toHaveLength(47);
  for (const family of families) {
    const path = family === 'laws' ? '/laws/online' : '/' + family;
    expect(backendRoute(path, 'GET', new Headers()).actor).toBe('public');
    expect(() => backendRoute('/admin/content/' + family, 'GET', new Headers())).toThrow();
    expect(() => backendRoute('/' + family, 'POST', new Headers())).toThrow();
  }
  for (const path of ['/laws/online', '/other-service-items/2', '/services/popular', '/other-service-categories/with-count']) expect(backendRoute(path, 'GET', new Headers()).actor).toBe('public');
  for (const path of ['/news/upload-image', '/unknown']) expect(() => backendRoute(path, 'POST', new Headers())).toThrow();
});

it('adds only finite public Registry GETs with exact query and authority policy', async () => {
  expect(backendRoute('/pharmacists?q=x&province=Bangkok&status=active&page=1&pageSize=10&sort=license&direction=desc', 'GET', new Headers()).actor).toBe('public');
  expect(backendRoute('/pharmacists/stats', 'GET', new Headers()).queryKeys).toEqual([]);
  expect(backendRoute('/pharmacists/1', 'GET', new Headers()).actor).toBe('public');
  for (const path of ['/pharmacists?unknown=x', '/pharmacists/1?q=x', '/pharmacists/0', '/admin/registry/pharmacists'])
    expect(() => backendRoute(path, 'GET', new Headers())).toThrow();
  for (const method of ['POST', 'PUT', 'DELETE'])
    expect(() => backendRoute('/pharmacists', method, new Headers())).toThrow();
  for (const path of ['/requests', '/admin/registry/requests', '/admin/registry/requests/detail?requestId=x'])
    for (const method of ['GET', 'POST', 'PUT', 'DELETE'])
      expect(() => backendRoute(path, method, new Headers({ 'Idempotency-Key': 'blocked' }))).toThrow();
  expect(() => backendRoute('/media/11111111-1111-4111-8111-111111111111/download', 'GET', new Headers())).toThrow();
  expect(() => backendRoute('/media/uploads/11111111-1111-4111-8111-111111111111', 'POST', new Headers())).toThrow();
  const response = await call('/pharmacists/stats');
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(upstream.mock.calls[0][0]).toBe('https://backend.example.test/api/pharmacists/stats');
  expect(new Headers(upstream.mock.calls[0][1]?.headers).get('authorization')).toBeNull();
});

it('enforces exact Pharmacy query spellings and rejects caller-controlled authority', () => {
  const cases = ['/news?category=news&status=published', '/medicine?status=published', '/public-project?status=published', '/honor?awardId=1', '/policy-projects?categoryId=1', '/products?category=x&search=x', '/services/popular', '/other-service-categories/with-count', '/laws/online', '/other-service-items/2'];
  for (const path of cases) expect(backendRoute(path, 'GET', new Headers()).actor).toBe('public');
  for (const path of ['/news?unknown=1', '/news?category=a&category=b', '/home-content?page=1', '/products?awardId=1', '/council?status=x', '/news?search=x']) expect(() => backendRoute(path, 'GET', new Headers())).toThrow();
  for (const path of ['https://evil.test/news', '//evil.test/news', '/news/../home-content', '/%252e%252e/news', '/news%2f1']) expect(() => backendRoute(path, 'GET', new Headers())).toThrow();
  for (const header of ['authorization', 'x-actor-id', 'x-backend-url', 'x-user-role']) expect(() => backendRoute('/news', 'GET', new Headers({ [header]: 'forged' }))).toThrow();
});

it('keeps the real Pharmacy proxy public-only and forwards to the fixed backend origin', async () => {
  upstream.mockResolvedValueOnce(Response.json({ message: 'Not Found' }, { status: 404 }));
  const response = await call('/news?status=published');
  expect(response.status).toBe(404);
  expect(upstream.mock.calls[0][0]).toBe('https://backend.example.test/api/news?status=published');
  expect(new Headers(upstream.mock.calls[0][1]?.headers).get('authorization')).toBeNull();
  expect((await call('/admin/content/news')).status).toBe(404);
  expect((await call('/news', 'POST', { 'content-type': 'application/json' }, '{}')).status).toBe(404);
  expect(upstream).toHaveBeenCalledTimes(1);
});

it('enumerates every accepted Pharmacy GET path with its exact finite query policy', () => {
  const expected: { method: string; path: string; keys: string[] }[] = [];
  for (const family of families) {
    if (family !== 'laws') expected.push({ method: 'GET', path: '/' + family, keys: publicKeys[family] ?? [] });
    if ([...articles, 'policy-categories', 'honor'].includes(family)) expected.push({ method: 'GET', path: '/' + family + '/1', keys: [] });
  }
  expected.push(...['/laws/online', '/other-service-items/1', '/services/popular', '/other-service-categories/with-count'].map(path => ({ method: 'GET', path, keys: [] })));
  expect(expected).toHaveLength(27);
  for (const route of expected) {
    const rule = backendRoute(route.path, route.method, new Headers());
    expect(rule.queryKeys, route.method + ' ' + route.path).toEqual(route.keys);
    expect(rule.actor).toBe('public');
    expect(() => backendRoute(route.path + '?unexpected=1', route.method, new Headers())).toThrow();
    expect(() => backendRoute(route.path + '/extra', route.method, new Headers())).toThrow();
  }
});


it('forwards public academy catalog without an /api prefix', async () => {
  const response = await call('/academy/courses');
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(upstream.mock.calls[0][0]).toBe('https://backend.example.test/academy/courses');
  expect(new Headers(upstream.mock.calls[0][1]?.headers).get('authorization')).toBeNull();
});

it('forwards only finite public honor detail GETs without cookies or caller authority', async () => {
  expect(backendRoute('/honor/1','GET',new Headers()).actor).toBe('public');
  for (const path of ['/honor/0','/honor/-1','/honor/1x','/honor/1/extra','/honor/1?awardId=1','/honor/1?x=a&x=b']) expect(() => backendRoute(path,'GET',new Headers())).toThrow();
  for (const header of ['authorization','x-actor-id','x-backend-url','x-user-role']) expect(() => backendRoute('/honor/1','GET',new Headers({[header]:'forged'}))).toThrow();
  const response=await call('/honor/1');expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');
  expect(upstream.mock.calls[0][0]).toBe('https://backend.example.test/api/honor/1');
  const headers=new Headers(upstream.mock.calls[0][1]?.headers);for(const name of ['authorization','cookie','x-csrf-token','origin'])expect(headers.get(name)).toBeNull();
  expect(upstream.mock.calls[0][1]?.cache).toBe('no-store');
  expect((await call('/honor/1?awardId=1')).status).toBe(400);
  expect((await call('/honor/1','POST',{'content-type':'application/json'},'{}')).status).toBe(404);
  expect(upstream).toHaveBeenCalledTimes(1);
});

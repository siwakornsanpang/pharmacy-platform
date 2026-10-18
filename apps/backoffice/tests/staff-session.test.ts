import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const context = vi.hoisted(() => ({ cookie: undefined as string | undefined }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: (name: string) => name === '__Host-pharmacy_staff' && context.cookie ? { value: context.cookie } : undefined }) }));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

const origin = 'https://staff.example.test';
const csrfToken = 'a'.repeat(64);
const user = { id: 7, username: 'staff', displayName: 'Staff Member', role: 'editor', permissions: ['manage_news'] };
const expiresAt = '2030-01-01T08:00:00.000Z';
const fetchMock = vi.fn<typeof fetch>();
const login = () => import('../src/app/api/auth/staff/login/route');
const logout = () => import('../src/app/api/auth/staff/logout/route');
const session = () => import('../src/app/api/auth/staff/session/route');
const helpers = () => import('../src/lib/auth/session');
function request(path: string, headers: Record<string, string> = {}, body?: unknown) {
  return new NextRequest(`${origin}/api/auth/staff/${path}`, {
    method: path === 'login' || path === 'logout' ? 'POST' : 'GET',
    headers: { origin, cookie: `__Host-pharmacy_csrf=${csrfToken}; __Host-pharmacy_staff=opaque-staff-token`, 'x-csrf-token': csrfToken, 'content-type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}
function backendLogin(overrides: Record<string, unknown> = {}) {
  return Response.json({ success: true, token: 'opaque-staff-token', expiresAt, user, ...overrides });
}
beforeEach(() => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('BACKEND_API_URL', 'https://backend.example.test');
  vi.stubEnv('BACKOFFICE_ORIGIN', origin);
  vi.stubEnv('ALLOW_LOCAL_UI_BYPASS', 'false');
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
  context.cookie = undefined;
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('staff login boundary', () => {
  it('login_never_returns_token_or_js_auth_cookie', async () => {
    fetchMock.mockResolvedValue(backendLogin({ user: { ...user, token: 'nested-leak' } }));
    const response = await (await login()).POST(request('login', {}, { username: 'staff', password: 'password', rememberMe: true }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(user);
    const cookies = response.headers.getSetCookie();
    expect(cookies.find(value => value.startsWith('__Host-pharmacy_staff='))).toContain('HttpOnly');
    for (const name of ['auth_token', 'user_role', 'user_display_name', 'user_id']) {
      expect(cookies.find(value => value.startsWith(`${name}=`))).toContain('Max-Age=0');
    }
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(fetchMock).toHaveBeenCalledWith('https://backend.example.test/api/auth/login', expect.objectContaining({ cache: 'no-store', redirect: 'error', body: JSON.stringify({ username: 'staff', password: 'password' }) }));
  });
  it('cookie_expiry_matches_session', async () => {
    fetchMock.mockResolvedValue(backendLogin());
    const response = await (await login()).POST(request('login', {}, { username: 'staff', password: 'password' }));
    const cookie = response.headers.getSetCookie().find(value => value.startsWith('__Host-pharmacy_staff='))!;
    expect(cookie).toContain('Expires=Tue, 01 Jan 2030 08:00:00 GMT');
    expect(cookie).toContain('Path=/');
    expect(cookie).toContain('SameSite=lax');
    expect(cookie).toContain('Secure');
    expect(cookie).not.toMatch(/Domain=|Max-Age=/i);
  });
  it('uses the unprefixed cookie only for validated development loopback', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('BACKEND_API_URL', 'http://127.0.0.1:8080');
    vi.stubEnv('BACKOFFICE_ORIGIN', 'http://localhost:3000');
    fetchMock.mockResolvedValue(backendLogin());
    const response = await (await login()).POST(request('login', { origin: 'http://localhost:3000', cookie: `pharmacy_csrf=${csrfToken}` }, { username: 'staff', password: 'password' }));
    const cookie = response.headers.getSetCookie().find(value => value.startsWith('pharmacy_staff='))!;
    expect(cookie).toContain('HttpOnly');
    expect(cookie).not.toMatch(/Secure|Domain=/i);
  });
  it.each([
    { expiresAt: '2000-01-01T00:00:00.000Z' }, { expiresAt: 'garbage' }, { expiresAt: 1893484800000 },
    { token: '' }, { token: 'bad\r\nheader' }, { success: false },
    { user: { ...user, id: 0 } }, { user: { ...user, username: null } },
    { user: { ...user, permissions: ['unknown_permission'] } },
  ])('rejects malformed backend login without setting staff credentials: %j', async overrides => {
    fetchMock.mockResolvedValue(backendLogin(overrides));
    const response = await (await login()).POST(request('login', {}, { username: 'staff', password: 'password' }));
    expect(response.status).toBe(503);
    expect(response.headers.getSetCookie().some(value => value.startsWith('__Host-pharmacy_staff='))).toBe(false);
    expect(JSON.stringify(await response.json())).not.toContain('opaque-staff-token');
  });
  it('returns safe invalid-credential errors without reflecting upstream content', async () => {
    fetchMock.mockResolvedValue(Response.json({ token: 'sensitive' }, { status: 401 }));
    const response = await (await login()).POST(request('login', {}, { username: 'staff', password: 'wrong' }));
    expect(response.status).toBe(401);
    expect(JSON.stringify(await response.json())).not.toContain('sensitive');
  });
  it('rejects invalid request JSON and empty credentials locally', async () => {
    const handler = (await login()).POST;
    expect((await handler(request('login', {}, { username: '', password: 'x' }))).status).toBe(400);
    const malformed = new NextRequest(`${origin}/api/auth/staff/login`, { method: 'POST', headers: { origin, cookie: `__Host-pharmacy_csrf=${csrfToken}`, 'x-csrf-token': csrfToken }, body: '{' });
    expect((await handler(malformed)).status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('CSRF and origin boundary', () => {
  it.each(['login', 'logout'])('csrf_and_origin_required_for_mutations: %s', async path => {
    const handler = path === 'login' ? (await login()).POST : (await logout()).POST;
    const deniedHeaders: Record<string, string>[] = [{ origin: '' }, { origin: 'null' }, { origin: 'https://foreign.test' }, { origin: 'https://other.example.test' }, { origin: `${origin}/` }, { 'x-csrf-token': '' }, { 'x-csrf-token': 'b'.repeat(64) }, { cookie: '__Host-pharmacy_staff=opaque-staff-token' }];
    for (const headers of deniedHeaders) {
      const response = await handler(request(path, headers, { username: 'staff', password: 'password' }));
      expect(response.status).toBe(403);
      expect(response.headers.getSetCookie()).toEqual([]);
      expect(response.headers.get('cache-control')).toBe('no-store');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('initializes an independent random host-only CSRF cookie before login', async () => {
    const handler = (await import('../src/app/api/auth/staff/csrf/route')).GET;
    const first = await handler(new NextRequest(`${origin}/api/auth/staff/csrf`));
    const second = await handler(new NextRequest(`${origin}/api/auth/staff/csrf`));
    const a = await first.json();
    const b = await second.json();
    expect(a.csrfToken).toMatch(/^[a-f0-9]{64}$/);
    expect(a.csrfToken).not.toBe(b.csrfToken);
    const cookie = first.headers.getSetCookie()[0];
    expect(cookie).toContain(`__Host-pharmacy_csrf=${a.csrfToken}`);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=lax');
    expect(cookie).toContain('Path=/');
    expect(cookie).not.toMatch(/Domain=/i);
    expect(first.headers.get('cache-control')).toBe('no-store');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('verified current staff', () => {
  it('missing cookie has no identity and does not contact upstream', async () => {
    expect(await (await helpers()).getVerifiedStaff()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('forged_or_stale_cookie_does_not_authorize', async () => {
    context.cookie = 'forged';
    fetchMock.mockResolvedValue(Response.json({ message: 'Unauthorized' }, { status: 401 }));
    expect(await (await helpers()).getVerifiedStaff()).toBeNull();
    const response = await (await session()).GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toBeNull();
    expect(response.headers.getSetCookie().find(value => value.startsWith('__Host-pharmacy_staff='))).toContain('Max-Age=0');
  });
  it('verifies the current actor on every call without crossing users or caching grants', async () => {
    context.cookie = 'first-token';
    fetchMock.mockResolvedValueOnce(Response.json({ ...user, token: 'not-public' }))
      .mockResolvedValueOnce(Response.json({ ...user, id: 8, permissions: [] }));
    expect(await (await helpers()).getVerifiedStaff()).toEqual(user);
    context.cookie = 'second-token';
    const response = await (await session()).GET();
    expect(await response.json()).toEqual({ ...user, id: 8, permissions: [] });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://backend.example.test/api/auth/me', expect.objectContaining({ cache: 'no-store', headers: { Authorization: 'Bearer first-token' } }));
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://backend.example.test/api/auth/me', expect.objectContaining({ headers: { Authorization: 'Bearer second-token' } }));
  });
  it.each(['outage', 'network', 'invalid-json', 'invalid-identity', 'forbidden'])('upstream %s is a typed failure and never an unauthenticated redirect', async kind => {
    context.cookie = 'opaque-staff-token';
    fetchMock.mockImplementation(async () => {
      if (kind === 'network' || kind === 'timeout') throw new Error(kind);
      if (kind === 'outage') return new Response('', { status: 503 });
      if (kind === 'forbidden') return new Response('', { status: 403 });
      if (kind === 'invalid-json') return new Response('{');
      return Response.json({ ...user, permissions: ['unknown_permission'] });
    });
    const { requireVerifiedStaff, StaffSessionError } = await helpers();
    await expect(requireVerifiedStaff()).rejects.toBeInstanceOf(StaffSessionError);
    const response = await (await session()).GET();
    expect(response.status).toBe(503);
    expect(response.headers.getSetCookie()).toEqual([]);
  });
  it('bounds verification with a real abort signal and preserves a timeout as typed failure', async () => {
    context.cookie = 'current';
    fetchMock.mockImplementation(async (_url, init) => {
      const signal = init?.signal;
      if (!signal) throw new Error('missing timeout signal');
      return new Promise<Response>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      });
    });
    const { getVerifiedStaff, StaffSessionError } = await helpers();
    const started = Date.now();
    await expect(getVerifiedStaff()).rejects.toBeInstanceOf(StaffSessionError);
    expect(Date.now() - started).toBeGreaterThanOrEqual(4_900);
    expect(Date.now() - started).toBeLessThan(7_000);
  }, 8_000);
  it('requires login only for a missing or rejected identity', async () => {
    await expect((await helpers()).requireVerifiedStaff()).rejects.toThrow('redirect:/login');
    context.cookie = 'current'; fetchMock.mockResolvedValue(Response.json(user));
    expect(await (await helpers()).requireVerifiedStaff()).toEqual(user);
  });
});

describe('logout', () => {
  it('revokes upstream and expires local staff and legacy cookies', async () => {
    fetchMock.mockResolvedValue(Response.json({ success: true }));
    const response = await (await logout()).POST(request('logout'));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledWith('https://backend.example.test/api/auth/logout', expect.objectContaining({ method: 'POST', cache: 'no-store', headers: { Authorization: 'Bearer opaque-staff-token' } }));
    for (const name of ['__Host-pharmacy_staff', 'auth_token', 'user_role', 'user_display_name', 'user_id']) {
      const cookie = response.headers.getSetCookie().find(value => value.startsWith(`${name}=`))!;
      expect(cookie).toContain('Max-Age=0'); expect(cookie).toContain('Path=/'); expect(cookie).not.toContain('Domain=');
    }
  });
  it.each(['outage', 'network', 'invalid-response', 'stale'])('clears local cookie but reports explicit remote revoke failure: %s', async kind => {
    if (kind === 'network') fetchMock.mockRejectedValue(new Error('sensitive upstream detail'));
    else fetchMock.mockResolvedValue(kind === 'invalid-response' ? Response.json({}) : new Response('', { status: kind === 'stale' ? 401 : 503 }));
    const response = await (await logout()).POST(request('logout'));
    expect(response.status).toBe(kind === 'stale' ? 401 : 503);
    expect(await response.json()).not.toHaveProperty('success', true);
    expect(response.headers.getSetCookie().find(value => value.startsWith('__Host-pharmacy_staff='))).toContain('Max-Age=0');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});

describe('navigation hints', () => {
  it('legacy cookies cannot admit navigation and stale staff never bounces login', async () => {
    const { middleware } = await import('../src/middleware');
    const legacy = middleware(new NextRequest(`${origin}/backoffice`, { headers: { cookie: 'auth_token=forged; user_role=admin' } }));
    expect(legacy.status).toBe(307);
    expect(legacy.headers.get('location')).toBe(`${origin}/login`);
    const stale = middleware(new NextRequest(`${origin}/login`, { headers: { cookie: '__Host-pharmacy_staff=stale' } }));
    expect(stale.headers.get('location')).toBeNull();
    const present = middleware(new NextRequest(`${origin}/backoffice`, { headers: { cookie: '__Host-pharmacy_staff=unverified' } }));
    expect(present.headers.get('location')).toBeNull();
  });
});

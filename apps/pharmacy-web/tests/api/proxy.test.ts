// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('server-only', () => ({}));
vi.mock('../../lib/server/backend-domain-routes', () => ({ backendDomainRoutes: [
        { method: 'GET', path: /^\/public\/registered$/, queryKeys: ['page'], actor: 'public' },
        { method: 'POST', path: /^\/public\/metadata$/, queryKeys: [], actor: 'public' },
        { method: 'GET', path: /^\/member\/registered$/, queryKeys: [], actor: 'member' },
    ] }));
import { GET, POST, PUT, DELETE, HEAD, PATCH, OPTIONS } from '../../app/api/backend/[...path]/route';
const upstream = vi.fn<typeof fetch>();
const origin = 'https://app.example.test';
const csrf = 'a'.repeat(64);
const user = { id: 7, username: 'staff', displayName: 'Staff', role: 'editor', permissions: ['manage_news'] };
function request(path: string, method = 'GET', headers: Record<string, string> = {}, body?: BodyInit) {
    return new NextRequest(origin + '/api/backend' + path, { method, headers: { origin, cookie: `__Host-pharmacy_staff=server-secret; __Host-pharmacy_csrf=${csrf}`, 'x-csrf-token': csrf, ...headers }, ...(body === undefined ? {} : { body }), ...(body instanceof ReadableStream ? { duplex: 'half' } : {}) } as ConstructorParameters<typeof NextRequest>[1]);
}
async function call(path: string, method = 'GET', headers: Record<string, string> = {}, body?: BodyInit, params?: string[]) {
    const handlers: Record<string, typeof GET> = { GET, POST, PUT, DELETE, HEAD, PATCH, OPTIONS };
    return handlers[method](request(path, method, headers, body), { params: Promise.resolve({ path: params ?? path.split('?')[0].slice(1).split('/').map(decodeURIComponent) }) });
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
it('proxy_rejects_disallowed_method_path_query_and_overrides', async () => {
    const cases: [
        string,
        string,
        Record<string, string>?
    ][] = [
        ['/auth/login', 'POST'], ['/auth/logout', 'POST'], ['/auth/seed', 'POST'], ['/permissions', 'POST'],
        ['/permissions/seed', 'POST'], ['/internal/revalidate', 'POST'], ['/unknown', 'GET'],
        ['/auth/me', 'PATCH'], ['/auth/me', 'OPTIONS'], ['/auth/me?role=admin', 'GET'],
        ['/public/registered?unexpected=1', 'GET'], ['/public/registered?page=1&page=2', 'GET'],
        ...['authorization', 'proxy-authorization', 'x-actor-id', 'x-user-role', 'x-bridge-token', 'x-backend-url', 'x-destination-url', 'x-trusted-actor', 'x-staff-id', 'x-session-id', 'x-current-user', 'x-original-url'].map(header => ['/public/registered', 'GET', { [header]: 'forged' }] as [
            string,
            string,
            Record<string, string>
        ])
    ];
    for (const [path, method, headers] of cases)
        expect((await call(path, method, headers)).status).toBeGreaterThanOrEqual(400);
    expect(upstream).not.toHaveBeenCalled();
});
it('encoded_traversal_and_destination_url_are_rejected', async () => {
    for (const path of ['/auth%2fme', '/auth%5cme', '/%252e%252e/auth/me', '/https%3a%2f%2fattacker.test', '//attacker.test', '/auth/me?url=https://attacker.test'])
        expect((await call(path)).status).toBeGreaterThanOrEqual(400);
    expect((await call('/public/registered', 'GET', {}, undefined, ['..', 'auth', 'me'])).status).toBeGreaterThanOrEqual(400);
    expect(upstream).not.toHaveBeenCalled();
});
it('registered domain route works while its unregistered sibling is denied', async () => {
    const response = await call('/public/registered?page=1');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(upstream.mock.calls[0][0]).toBe('https://backend.example.test/api/public/registered?page=1');
    const headers = new Headers(upstream.mock.calls[0][1]?.headers);
    for (const key of ['cookie', 'authorization', 'x-csrf-token', 'origin'])
        expect(headers.get(key)).toBeNull();
    expect((await call('/public/sibling')).status).toBe(404);
    expect(upstream).toHaveBeenCalledTimes(1);
});
it('member routes fail closed without the verified member adapter', async () => {
    expect((await call('/member/registered')).status).toBe(401);
    expect(upstream).not.toHaveBeenCalled();
});
it('proxy_rejects_file_body_without_forwarding', async () => {
    for (const contentType of ['multipart/form-data; boundary=x', 'application/octet-stream', 'text/plain'])
        expect((await call('/public/metadata', 'POST', { 'content-type': contentType }, 'file')).status).toBe(415);
    expect(upstream).not.toHaveBeenCalled();
});
it('counts streamed metadata to 4000000 bytes even without or with lying Content-Length', async () => {
    for (const headers of [{}, { 'content-length': '2' }] as Record<string, string>[]) {
        const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new Uint8Array(2000000).fill(32)); c.enqueue(new Uint8Array(2000001).fill(32)); c.close(); } });
        expect((await call('/public/metadata', 'POST', { 'content-type': 'application/json', ...headers }, body)).status).toBe(413);
    }
    expect(upstream).not.toHaveBeenCalled();
});
it('mutations reject foreign/missing origin and CSRF before contacting upstream', async () => {
    for (const headers of [{ origin: '' }, { origin: 'https://foreign.test' }, { origin: origin + '/' }, { 'x-csrf-token': '' }, { 'x-csrf-token': 'b'.repeat(64) }] as Record<string, string>[])
        expect((await call('/public/metadata', 'POST', { 'content-type': 'application/json', ...headers }, '{}')).status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
});
it('pharmacy never registers staff access paths even with staff-looking cookies', async () => {
    for (const path of ['/auth/me', '/auth/users', '/auth/assignable-roles', '/permissions', '/permissions/my', '/permissions/roles'])
        expect((await call(path)).status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
});
it('public mutations fail closed until the owning mutation adapter exists', async () => {
    expect((await call('/public/metadata', 'POST', { 'content-type': 'application/json' }, '{}')).status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
});
it('removes external API rewrites while preserving friendly public and member aliases', async () => {
    const config = (await import('../../next.config')).default;
    const rewrites = await (config.rewrites as () => Promise<{
        beforeFiles: {
            source: string;
            destination: string;
        }[];
    }>)();
    expect(rewrites.beforeFiles.every(rule => rule.destination.startsWith('/'))).toBe(true);
    expect(rewrites.beforeFiles).toContainEqual({ source: '/home', destination: '/01_home' });
    expect(rewrites.beforeFiles).toContainEqual({ source: '/profile/:path*', destination: '/02_profile/:path*' });
    expect(rewrites.beforeFiles.some(rule => rule.source === '/api/proxy/:path*')).toBe(false);
    expect(rewrites.beforeFiles).toHaveLength(36);
});

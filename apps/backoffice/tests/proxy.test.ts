// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
vi.mock('server-only', () => ({}));
vi.mock('../src/lib/server/backend-domain-routes', () => ({ backendDomainRoutes: [
        { method: 'GET', path: /^\/public\/registered$/, queryKeys: ['page'], actor: 'public' },
        { method: 'POST', path: /^\/public\/metadata$/, queryKeys: [], actor: 'public' },
        { method: 'GET', path: /^\/member\/registered$/, queryKeys: [], actor: 'member' },
    ] }));
import { GET, POST, PUT, DELETE, HEAD, PATCH, OPTIONS } from '../src/app/api/backend/[...path]/route';
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
    vi.stubEnv('BACKOFFICE_ORIGIN', origin);
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
        expect((await call('/auth/users', 'POST', { 'content-type': contentType }, 'file')).status).toBe(415);
    expect(upstream).not.toHaveBeenCalled();
});
it('counts streamed metadata to 4000000 bytes even without or with lying Content-Length', async () => {
    for (const headers of [{}, { 'content-length': '2' }] as Record<string, string>[]) {
        const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new Uint8Array(2000000).fill(32)); c.enqueue(new Uint8Array(2000001).fill(32)); c.close(); } });
        expect((await call('/auth/users', 'POST', { 'content-type': 'application/json', ...headers }, body)).status).toBe(413);
    }
    expect(upstream).not.toHaveBeenCalled();
});
it('mutations reject foreign/missing origin and CSRF before contacting upstream', async () => {
    for (const headers of [{ origin: '' }, { origin: 'https://foreign.test' }, { origin: origin + '/' }, { 'x-csrf-token': '' }, { 'x-csrf-token': 'b'.repeat(64) }] as Record<string, string>[])
        expect((await call('/auth/users', 'POST', { 'content-type': 'application/json', ...headers }, '{}')).status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
});
it('staff route synthesizes server-held token and current actor remains backend-owned', async () => {
    upstream.mockResolvedValueOnce(Response.json({ ...user, token: 'must-not-leak' }));
    const response = await call('/auth/me');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(user);
    const [url, init] = upstream.mock.calls[0];
    expect(url).toBe('https://backend.example.test/api/auth/me');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer server-secret');
    expect(new Headers(init?.headers).get('cookie')).toBeNull();
    expect((await call('/auth/me', 'GET', { cookie: 'user_role=admin; auth_token=forged' })).status).toBe(401);
    expect(upstream).toHaveBeenCalledTimes(1);
});
it('stale 401 clears staff cookies while outage/network/invalid JSON are typed failures', async () => {
    upstream.mockResolvedValueOnce(Response.json({ message: 'secret' }, { status: 401 }));
    const stale = await call('/auth/me');
    expect(stale.status).toBe(401);
    expect(stale.headers.getSetCookie().find(v => v.startsWith('__Host-pharmacy_staff='))).toContain('Max-Age=0');
    for (const kind of ['outage', 'network', 'invalid-json', 'unknown-permission']) {
        if (kind === 'network')
            upstream.mockRejectedValueOnce(new Error('secret'));
        else
            upstream.mockResolvedValueOnce(kind === 'outage' ? new Response('', { status: 503 }) : kind === 'invalid-json' ? new Response('{') : Response.json({ ...user, permissions: ['unknown_capability'] }));
        const response = await call('/auth/me');
        expect(response.status).toBe(503);
        expect(response.headers.getSetCookie()).toEqual([]);
        expect(await response.text()).not.toContain('secret');
    }
});
it('forwards exact access methods and validates mutation capability keys before fetch', async () => {
    const reads = ['/auth/users', '/auth/assignable-roles', '/permissions', '/permissions/my', '/permissions/roles', '/permissions/roles/editor'];
    for (const path of reads) {
        upstream.mockResolvedValueOnce(Response.json(path === '/permissions/my' ? ['manage_news'] : []));
        expect((await call(path)).status).toBe(200);
    }
    const before = upstream.mock.calls.length;
    for (const [path, method, body] of [
        ['/permissions/roles', 'POST', { role: 'custom', permissions: ['unknown'] }],
        ['/permissions/roles/editor', 'PUT', { permissions: ['manage_news'], actorRole: 'admin' }],
        ['/auth/users', 'POST', { username: 'x', password: 'x', displayName: 'x', role: 'viewer', currentActor: 'admin' }],
    ] as const)
        expect((await call(path, method, { 'content-type': 'application/json' }, JSON.stringify(body))).status).toBe(400);
    expect(upstream).toHaveBeenCalledTimes(before);
    for (const [path, method, body] of [
        ['/auth/users', 'POST', { username: 'x', password: 'long-password', displayName: 'x', role: 'viewer' }],
        ['/auth/users/7', 'PUT', { role: 'editor' }], ['/auth/users/7', 'DELETE', undefined],
        ['/permissions/roles', 'POST', { role: 'custom', permissions: ['manage_news'] }],
        ['/permissions/roles/custom', 'PUT', { permissions: ['manage_news'] }], ['/permissions/roles/custom', 'DELETE', undefined],
    ] as const) {
        upstream.mockResolvedValueOnce(new Response(null, { status: 204 }));
        expect((await call(path, method, { 'content-type': 'application/json' }, body === undefined ? undefined : JSON.stringify(body))).status).toBe(204);
    }
});
it('role mutation JSON remains success while a GET role response validates catalog keys', async () => {
    upstream.mockResolvedValueOnce(Response.json({ success: true, role: 'custom', permissions: ['manage_news'] }));
    const response = await call('/permissions/roles/custom', 'PUT', { 'content-type': 'application/json' }, JSON.stringify({ permissions: ['manage_news'] }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true, role: 'custom', permissions: ['manage_news'] });
    upstream.mockResolvedValueOnce(Response.json(['unknown_capability']));
    expect((await call('/permissions/roles/custom')).status).toBe(503);
});
it('validates decoded role names rather than limiting percent-encoded path bytes', async () => {
    const role = encodeURIComponent('ก'.repeat(100));
    upstream.mockResolvedValueOnce(Response.json(['manage_news']));
    expect((await call('/permissions/roles/' + role)).status).toBe(200);
    const count = upstream.mock.calls.length;
    expect((await call('/permissions/roles/' + encodeURIComponent('ก'.repeat(101)))).status).toBe(400);
    expect(upstream).toHaveBeenCalledTimes(count);
});
it('encoded symbol role names complete create read update delete at the fixed backend origin', async () => {
    for (const role of ['editor@east', 'editor:east', 'editor#east', 'editor?east']) {
        const path = '/permissions/roles/' + encodeURIComponent(role);
        upstream.mockResolvedValueOnce(Response.json({ success: true, role }));
        expect((await call('/permissions/roles', 'POST', { 'content-type': 'application/json' }, JSON.stringify({ role, permissions: [] }))).status).toBe(200);
        upstream.mockResolvedValueOnce(Response.json(['manage_news']));
        expect((await call(path)).status).toBe(200);
        upstream.mockResolvedValueOnce(Response.json({ success: true, role, permissions: [] }));
        expect((await call(path, 'PUT', { 'content-type': 'application/json' }, JSON.stringify({ permissions: [] }))).status).toBe(200);
        upstream.mockResolvedValueOnce(Response.json({ success: true }));
        expect((await call(path, 'DELETE')).status).toBe(200);
    }
    expect(upstream).toHaveBeenCalledTimes(16);
    for (const [url] of upstream.mock.calls) {
        expect(new URL(String(url)).origin).toBe('https://backend.example.test');
        expect(new URL(String(url)).search).toBe('');
        expect(new URL(String(url)).hash).toBe('');
    }
});
it('unaddressable role create and assignment inputs are rejected without forwarding', async () => {
    for (const role of ['.', '..', '...', ' . ', 'editor\n', 'editor/east', 'editor\\east', 'editor%east', '%2e%2e', 'editor\u0000east', ' ']) {
        expect((await call('/permissions/roles', 'POST', { 'content-type': 'application/json' }, JSON.stringify({ role, permissions: [] }))).status).toBe(400);
        expect((await call('/auth/users/7', 'PUT', { 'content-type': 'application/json' }, JSON.stringify({ role }))).status).toBe(400);
    }
    expect(upstream).not.toHaveBeenCalled();
});

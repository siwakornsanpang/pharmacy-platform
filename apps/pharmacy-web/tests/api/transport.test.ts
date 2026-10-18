// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { backendFetch } from '../../lib/api/server';
import { browserApi, browserFetch, authFetch } from '../../lib/api/browser';
import { ApiError } from '../../lib/api/types';
const upstream = vi.fn<typeof fetch>();
beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('BACKEND_API_URL', 'https://backend.example.test');
    vi.stubEnv('PHARMACY_WEB_ORIGIN', 'https://app.example.test');
    vi.stubEnv('PHARMACY_SESSION_SECRET', 'fake-pharmacy-session-secret-at-least-32-ch');
    vi.stubEnv('ACADEMY_BRIDGE_KEY', 'fake-academy-secret');
    vi.stubEnv('CONFERENCE_API_URL', 'https://conference.example.test');
    vi.stubEnv('ALLOW_LOCAL_UI_BYPASS', 'false');
    vi.stubGlobal('fetch', upstream);
    upstream.mockReset();
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });
it('transport_preserves_empty_stream_abort_errors', async () => {
    upstream.mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect(await backendFetch<void>('/auth/users/3', { method: 'DELETE', staffToken: 'server-secret' })).toBeUndefined();
    const raw = new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('small-file')); c.close(); } }));
    upstream.mockResolvedValueOnce(raw);
    const response = await backendFetch('/api/media/download/7', { response: 'response' });
    expect(response).toBe(raw);
    expect(await response.text()).toBe('small-file');
    expect(upstream.mock.calls[1][1]).toMatchObject({ redirect: 'manual', cache: 'no-store' });
    const controller = new AbortController();
    controller.abort();
    await expect(backendFetch('/auth/me', { signal: controller.signal })).rejects.toMatchObject({ kind: 'aborted' });
    expect(upstream).toHaveBeenCalledTimes(2);
});
it('normalizes the api prefix once and synthesizes authorization only on the server', async () => {
    upstream.mockResolvedValue(Response.json({ ok: true }));
    expect(await backendFetch('/api/auth/me', { staffToken: 'server-secret' })).toEqual({ ok: true });
    const [url, init] = upstream.mock.calls[0];
    expect(url).toBe('https://backend.example.test/api/auth/me');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer server-secret');
    expect(init).toMatchObject({ cache: 'no-store', credentials: 'omit', redirect: 'manual' });
    await expect(backendFetch('/auth/me', { headers: { Authorization: 'browser-secret' } })).rejects.toMatchObject({ kind: 'invalid_request' });
    await expect(backendFetch('https://attacker.test/auth/me')).rejects.toBeInstanceOf(ApiError);
    expect(upstream).toHaveBeenCalledTimes(1);
});
it.each(['{', ''])('rejects invalid JSON %j as a typed upstream failure', async (body) => {
    upstream.mockResolvedValue(new Response(body));
    await expect(backendFetch('/auth/me')).rejects.toMatchObject({ kind: 'invalid_response', status: 503 });
});
it('does not retry mutations on HTTP or network failures', async () => {
    upstream.mockResolvedValueOnce(Response.json({ token: 'not-reflected' }, { status: 503 }));
    await expect(backendFetch('/auth/users', { method: 'POST', body: '{}' })).rejects.toMatchObject({ kind: 'http', status: 503 });
    upstream.mockRejectedValueOnce(new Error('network secret'));
    await expect(backendFetch('/auth/users', { method: 'POST', body: '{}' })).rejects.toMatchObject({ kind: 'network', status: 503 });
    expect(upstream).toHaveBeenCalledTimes(2);
});
it('composes timeout and caller abort and cleans up its listener', async () => {
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    upstream.mockImplementation(async (_url, init) => new Promise<Response>((_resolve, reject) => {
        init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason), { once: true });
    }));
    await expect(backendFetch('/auth/me', { timeoutMs: 5, signal: controller.signal })).rejects.toMatchObject({ kind: 'timeout' });
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    const pending = backendFetch('/auth/me', { timeoutMs: 500, signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ kind: 'aborted' });
});
it('browser raw compatibility preserves 401 while decoded calls throw and never expose JWT', async () => {
    upstream.mockResolvedValueOnce(Response.json({ message: 'Unauthorized' }, { status: 401 }));
    const raw = await authFetch('/api/auth/me');
    expect(raw.status).toBe(401);
    expect(upstream.mock.calls[0][0]).toBe('/api/backend/auth/me');
    expect(upstream.mock.calls[0][1]).toMatchObject({ credentials: 'same-origin', cache: 'no-store', redirect: 'manual' });
    expect(new Headers(upstream.mock.calls[0][1]?.headers).get('authorization')).toBeNull();
    upstream.mockResolvedValueOnce(Response.json({}, { status: 401 }));
    await expect(browserApi('/auth/me')).rejects.toMatchObject({ kind: 'http', status: 401 });
    upstream.mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect(await browserApi<void>('/auth/me')).toBeUndefined();
});
it('browser rejects file bodies and all GET/HEAD bodies before fetch', async () => {
    for (const body of [new FormData(), new Blob(['file']), new Uint8Array([1]), new URLSearchParams('file=x')])
        await expect(browserFetch('/metadata', { method: 'POST', body })).rejects.toMatchObject({ kind: 'invalid_request' });
    for (const method of ['GET', 'HEAD'])
        await expect(browserFetch('/auth/me', { method, body: '{}' })).rejects.toBeInstanceOf(ApiError);
    expect(upstream).not.toHaveBeenCalled();
});
it('metadata request is JSON only and carries no JWT', async () => {
    upstream.mockResolvedValue(Response.json({ ticket: 'opaque-ticket', expiresIn: 300 }));
    const result = await browserApi('/media/tickets', { method: 'POST', headers: { 'x-csrf-token': 'csrf-from-owner' }, body: JSON.stringify({ kind: 'document', size: 21 }) });
    expect(result).toEqual({ ticket: 'opaque-ticket', expiresIn: 300 });
    const [url, init] = upstream.mock.calls.at(-1)!;
    expect(url).toBe('/api/backend/media/tickets');
    expect(new Headers(init?.headers).get('authorization')).toBeNull();
    expect(new Headers(init?.headers).get('content-type')).toBe('application/json');
});
it('decoded browser requests enforce timeout through JSON body consumption', async () => {
    upstream.mockImplementation(async (_url, init) => new Response(new ReadableStream({ start(controller) {
            const timer = setTimeout(() => { controller.enqueue(new TextEncoder().encode('{"ok":true}')); controller.close(); }, 25);
            init!.signal!.addEventListener('abort', () => { clearTimeout(timer); controller.error(new Error('aborted body')); }, { once: true });
        } })));
    await expect(browserApi('/metadata', { timeoutMs: 5 })).rejects.toMatchObject({ kind: 'timeout' });
});
it('raw redirects are returned without following a private download destination', async () => {
    upstream.mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'https://download.example.test/private' } }));
    const raw = await backendFetch('/media/download/7', { response: 'response' });
    expect(raw.status).toBe(302);
    expect(raw.headers.get('location')).toBe('https://download.example.test/private');
    expect(upstream).toHaveBeenCalledTimes(1);
});
it('bounded upstream JSON rejects oversized responses without a retry', async () => {
    upstream.mockResolvedValueOnce(new Response(new ReadableStream({ start(c) { c.enqueue(new Uint8Array(4000001)); c.close(); } })));
    await expect(backendFetch('/public/metadata')).rejects.toMatchObject({ kind: 'invalid_response', status: 503 });
    expect(upstream).toHaveBeenCalledTimes(1);
});
it('HEAD never sends a body and decoded success is empty', async () => {
    upstream.mockResolvedValueOnce(new Response(null, { status: 200 }));
    expect(await backendFetch<void>('/public/metadata', { method: 'HEAD' })).toBeUndefined();
    expect(upstream.mock.calls[0][1]?.body).toBeUndefined();
});

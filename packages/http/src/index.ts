export type ApiOptions = RequestInit & { timeoutMs?: number };
export class ApiError extends Error {
    constructor(public readonly kind: 'invalid_request' | 'too_large' | 'http' | 'network' | 'timeout' | 'aborted' | 'invalid_response', public readonly status: number = 503) {
        super(kind === 'http' ? `API request failed (${status})` : `API ${kind}`);
        this.name = 'ApiError';
    }
}
// Accept only local API paths; reject encoded separators and repeated decoding.
export function isAddressableSegment(segment: string): boolean {
    return !!segment && !/^\.+$/.test(segment) && !/[%/\\\x00-\x1f\x7f]/.test(segment);
}
export function apiPath(input: string): string {
    if (!input.startsWith('/') || input.startsWith('//') || /[\\#\x00-\x20\x7f]/.test(input))
        throw new ApiError('invalid_request', 400);
    const [pathname, query] = input.split(/\?(.*)/);
    for (const segment of pathname.slice(1).split('/')) {
        let decoded: string;
        try {
            decoded = decodeURIComponent(segment);
        }
        catch {
            throw new ApiError('invalid_request', 400);
        }
        if (!isAddressableSegment(decoded))
            throw new ApiError('invalid_request', 400);
    }
    const path = pathname.startsWith('/api/') ? pathname.slice(4) : pathname;
    if (path === '/api' || path.startsWith('/api/'))
        throw new ApiError('invalid_request', 400);
    return path + (query === undefined ? '' : '?' + query);
}
export function rejectsAuthorityHeaders(headers: Headers): boolean {
    return [...headers.keys()].some(key => /auth|actor|roles?|permissions?|bridge|staff|session|destination|target|upstream|backend|(?:api|base|proxy|original|request)-url|^x-(?:current-|trusted-)?user(?:-|$)/i.test(key));
}

const metadataLimit = 4000000;
export async function metadataText(body: ReadableStream<Uint8Array> | null, limit = metadataLimit): Promise<string> {
    if (!body)
        return '';
    const reader = body.getReader();
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let size = 0;
    let text = '';
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done)
                break;
            size += value.byteLength;
            if (size > limit)
                throw new ApiError('too_large', 413);
            text += decoder.decode(value, { stream: true });
        }
        return text + decoder.decode();
    }
    catch (error) {
        void reader.cancel().catch(() => { });
        throw error;
    }
    finally {
        reader.releaseLock();
    }
}
export async function decodeResponse<T>(response: Response, method = 'GET'): Promise<T> {
    if (!response.ok)
        throw new ApiError('http', response.status);
    if (method.toUpperCase() === 'HEAD' || response.status === 204 || response.status === 205)
        return undefined as T;
    try {
        return JSON.parse(await metadataText(response.body)) as T;
    }
    catch {
        throw new ApiError('invalid_response');
    }
}
export function metadataHeaders(init: RequestInit): Headers {
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = new Headers(init.headers);
    if (init.body != null) {
        if (method === 'GET' || method === 'HEAD' || typeof init.body !== 'string' ||
            (headers.has('content-type') && !/^application\/json(?:\s*;|$)/i.test(headers.get('content-type')!)))
            throw new ApiError('invalid_request', 400);
        if (new TextEncoder().encode(init.body).byteLength > metadataLimit)
            throw new ApiError('too_large', 413);
        try {
            JSON.parse(init.body);
        }
        catch {
            throw new ApiError('invalid_request', 400);
        }
        headers.set('content-type', 'application/json');
    }
    headers.set('accept', 'application/json');
    return headers;
}
// Isomorphic native-fetch primitive; server.ts supplies its fixed origin and credentials.
export async function nativeRequest<T>(url: string, options: ApiOptions, credentials: RequestCredentials, consume: (response: Response) => Promise<T>): Promise<T> {
    const { timeoutMs = 10000, signal, ...init } = options;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2147483647)
        throw new ApiError('invalid_request', 400);
    const method = (init.method ?? 'GET').toUpperCase();
    const headers = metadataHeaders(init);
    if (signal?.aborted)
        throw new ApiError('aborted');
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
        return await consume(await fetch(url, { ...init, method, headers, credentials, cache: 'no-store', redirect: 'manual', signal: controller.signal }));
    }
    catch (error) {
        if (controller.signal.aborted)
            throw new ApiError(timedOut ? 'timeout' : 'aborted');
        if (error instanceof ApiError)
            throw error;
        throw new ApiError('network');
    }
    finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
    }
}

export async function requestMetadata(request: Request, maxBytes = metadataLimit): Promise<string | undefined> {
    if (!request.body)
        return undefined;
    if (request.method === 'GET' || request.method === 'HEAD')
        throw new ApiError('invalid_request', 400);
    const contentType = request.headers.get('content-type') ?? '';
    // Chrome/Next send DELETE with an empty body stream and no JSON Content-Type.
    if (request.method === 'DELETE' && !/^application\/json(?:\s*;|$)/i.test(contentType))
        return undefined;
    if (!/^application\/json(?:\s*;|$)/i.test(contentType))
        throw new ApiError('invalid_request', 415);
    let text: string;
    try {
        text = await metadataText(request.body, maxBytes);
    }
    catch (error) {
        if (error instanceof ApiError)
            throw error;
        throw new ApiError('invalid_request', 400);
    }
    try {
        JSON.parse(text);
    }
    catch {
        throw new ApiError('invalid_request', 400);
    }
    return text;
}

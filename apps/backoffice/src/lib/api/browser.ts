import { apiPath, ApiError, decodeResponse, metadataHeaders, nativeRequest, rejectsAuthorityHeaders, type ApiOptions } from '@pharmacy/http';

async function browserRequest<T>(path: string, options: ApiOptions, consume: (response: Response) => Promise<T>): Promise<T> {
    const target = '/api/backend' + apiPath(path);
    const headers = metadataHeaders(options);
    if (rejectsAuthorityHeaders(headers) || headers.has('cookie'))
        throw new ApiError('invalid_request', 400);
    if (!['GET', 'HEAD'].includes((options.method ?? 'GET').toUpperCase()) && !headers.has('x-csrf-token')) {
        const value = await nativeRequest('/api/auth/staff/csrf', { signal: options.signal, timeoutMs: options.timeoutMs }, 'same-origin', decodeResponse<{
            csrfToken: string;
        }>);
        if (!/^[a-f0-9]{64}$/.test(value.csrfToken))
            throw new ApiError('invalid_response');
        headers.set('x-csrf-token', value.csrfToken);
    }
    return nativeRequest(target, { ...options, headers }, 'same-origin', consume);
}
// Raw callers inspect HTTP status and own stream consumption; decoded calls keep the deadline through JSON reading.
export function browserFetch(path: string, options: ApiOptions = {}): Promise<Response> {
    return browserRequest(path, options, async (response) => response);
}
export function browserApi<T>(path: string, options: ApiOptions = {}): Promise<T> {
    return browserRequest(path, options, response => decodeResponse<T>(response, options.method));
}
export function authFetch(url: string, options?: RequestInit): Promise<Response> {
    return browserFetch(url, options);
}

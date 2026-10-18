import 'server-only';
import { getServerConfig } from '../config/server';
import { decodeResponse, nativeRequest, requestMetadata as readRequestMetadata } from '@pharmacy/http';
import { ApiError, apiPath, rejectsAuthorityHeaders, type ServerApiOptions } from './types';
export function backendFetch(path: string, options: ServerApiOptions & {
    response: 'response';
}): Promise<Response>;
export function backendFetch<T = unknown>(path: string, options?: ServerApiOptions): Promise<T>;
export async function backendFetch<T>(path: string, options: ServerApiOptions & {
    response?: 'response';
} = {}): Promise<T | Response> {
    const normalized = apiPath(path);
    const pathname = normalized.split('?')[0];
    const prefixed = pathname === '/academy' || pathname.startsWith('/academy/') ? normalized : '/api' + normalized;
    const target = getServerConfig().backendApiUrl + prefixed;
    const { staffToken, response, ...init } = options;
    const headers = new Headers(init.headers);
    if (rejectsAuthorityHeaders(headers) || headers.has('cookie'))
        throw new ApiError('invalid_request', 400);
    if (staffToken !== undefined) {
        if (!staffToken || /[\x00-\x20\x7f]/.test(staffToken))
            throw new ApiError('invalid_request', 400);
        headers.set('authorization', `Bearer ${staffToken}`);
    }
    return nativeRequest<T | Response>(target, { ...init, headers }, 'omit', response === 'response' ? async (raw) => raw : raw => decodeResponse<T>(raw, init.method));
}
export function requestMetadata(request: Request): Promise<string | undefined> {
    return readRequestMetadata(request, getServerConfig().jsonMetadataMaxBytes);
}

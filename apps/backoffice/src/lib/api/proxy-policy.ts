import 'server-only';
import { isPermissionKey } from '@pharmacy/contracts/access';
import { staffIdentity } from '../auth/session';
import { backendDomainRoutes } from '../server/backend-domain-routes';
import { ApiError, apiPath, isAddressableSegment, rejectsAuthorityHeaders, type BackendRouteRule } from './types';
const rolePath = /^\/permissions\/roles\/[^/]+$/;
const staffRule = (method: string, path: RegExp): BackendRouteRule => ({ method, path, queryKeys: [], actor: 'staff' });
const accessRoutes: readonly BackendRouteRule[] = Object.freeze([
    staffRule('GET', /^\/auth\/me$/),
    staffRule('GET', /^\/auth\/(?:users|assignable-roles)$/),
    staffRule('POST', /^\/auth\/users$/),
    staffRule('PUT', /^\/auth\/users\/[1-9][0-9]*$/),
    staffRule('DELETE', /^\/auth\/users\/[1-9][0-9]*$/),
    staffRule('GET', /^\/permissions(?:\/(?:my|roles))?$/),
    staffRule('GET', rolePath), staffRule('POST', /^\/permissions\/roles$/),
    staffRule('PUT', rolePath), staffRule('DELETE', rolePath),
]);
export function backendRoute(path: string, method: string, headers: Headers): BackendRouteRule {
    if (rejectsAuthorityHeaders(headers))
        throw new ApiError('invalid_request', 400);
    const normalized = apiPath(path);
    const url = new URL(normalized, 'https://path.invalid');
    const rule = [...accessRoutes, ...backendDomainRoutes].find(rule => {
        rule.path.lastIndex = 0;
        return rule.method === method && rule.path.test(url.pathname);
    });
    if (!rule)
        throw new ApiError('invalid_request', 404);
    const idempotencyKey = headers.get('idempotency-key');
    if (rule.forwardIdempotencyKey) {
        if (idempotencyKey === null || !/^[\x21-\x7e]{1,128}$/.test(idempotencyKey))
            throw new ApiError('invalid_request', 400);
    }
    else if (idempotencyKey !== null)
        throw new ApiError('invalid_request', 400);
    const keys = [...url.searchParams.keys()];
    if (keys.some(key => !rule.queryKeys.includes(key)) || new Set(keys).size !== keys.length)
        throw new ApiError('invalid_request', 400);
    if (rule.requiredQueryKeys?.some(key => !url.searchParams.has(key)))
        throw new ApiError('invalid_request', 400);
    const requestId = url.searchParams.get('requestId');
    if (rule.requiredQueryKeys?.includes('requestId') &&
        (requestId === null || !requestId.trim() || [...requestId].length > 50 || /[\x00-\x1f\x7f]/.test(requestId)))
        throw new ApiError('invalid_request', 400);
    const legacyRequest = url.pathname.match(/^\/requests\/([^/]+)(?:\/payment)?$/);
    if (legacyRequest) {
        const decoded = decodeURIComponent(legacyRequest[1]);
        if (!decoded.trim() || [...decoded].length > 50 || /[\x00-\x1f\x7f]/.test(decoded))
            throw new ApiError('invalid_request', 400);
    }
    return rule;
}
export function requestForwardHeaders(rule: BackendRouteRule, headers: Headers): Headers | undefined {
    if (!rule.forwardIdempotencyKey)
        return undefined;
    return new Headers({ 'Idempotency-Key': headers.get('idempotency-key')! });
}
export function validateAccessMetadata(path: string, method: string, text?: string): void {
    const pathname = apiPath(path).split('?')[0];
    const roleMatch = pathname.match(/^\/permissions\/roles\/(.+)$/);
    // New roles must remain addressable as one segment; encoded @ : # ? are data, while % stays ambiguous.
    const validRole = (value: unknown) => typeof value === 'string' && value.length <= 100 && isAddressableSegment(value) && isAddressableSegment(value.trim());
    if (roleMatch && !validRole(decodeURIComponent(roleMatch[1])))
        throw new ApiError('invalid_request', 400);
    if (method === 'GET' || method === 'HEAD')
        return;
    let fields: readonly string[];
    if (pathname === '/auth/users' && method === 'POST')
        fields = ['username', 'password', 'displayName', 'role'];
    else if (/^\/auth\/users\/[0-9]+$/.test(pathname))
        fields = method === 'DELETE' ? [] : ['role', 'isActive', 'password', 'displayName'];
    else if (pathname === '/permissions/roles' && method === 'POST')
        fields = ['role', 'permissions'];
    else if (roleMatch)
        fields = method === 'DELETE' ? [] : ['permissions'];
    else
        return;
    const body: unknown = text === undefined ? {} : JSON.parse(text);
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !fields.includes(key)))
        throw new ApiError('invalid_request', 400);
    const input = body as Record<string, unknown>;
    if ('role' in input && !validRole(input.role))
        throw new ApiError('invalid_request', 400);
    if ('permissions' in input && (!Array.isArray(input.permissions) || !input.permissions.every(isPermissionKey)))
        throw new ApiError('invalid_request', 400);
}
export function publicAccessResponse(path: string, method: string, value: unknown): unknown {
    const pathname = apiPath(path).split('?')[0];
    if (pathname === '/auth/me')
        return staffIdentity(value);
    if (method === 'GET' && (pathname === '/permissions/my' || /^\/permissions\/roles\/.+/.test(pathname))) {
        if (!Array.isArray(value) || !value.every(isPermissionKey))
            throw new ApiError('invalid_response');
    }
    if (pathname === '/permissions' && (!Array.isArray(value) || value.some(item => !item || !isPermissionKey(item.key))))
        throw new ApiError('invalid_response');
    return value;
}

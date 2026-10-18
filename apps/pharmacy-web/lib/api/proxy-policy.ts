import 'server-only';
import { backendDomainRoutes } from '../server/backend-domain-routes';
import { ApiError, apiPath, rejectsAuthorityHeaders, type BackendRouteRule } from './types';
export function backendRoute(path: string, method: string, headers: Headers): BackendRouteRule {
    if (rejectsAuthorityHeaders(headers))
        throw new ApiError('invalid_request', 400);
    const normalized = apiPath(path);
    const url = new URL(normalized, 'https://path.invalid');
    const rule = backendDomainRoutes.find(rule => {
        rule.path.lastIndex = 0;
        return rule.method === method && rule.path.test(url.pathname);
    });
    if (!rule)
        throw new ApiError('invalid_request', 404);
    const keys = [...url.searchParams.keys()];
    if (keys.some(key => !rule.queryKeys.includes(key)) || new Set(keys).size !== keys.length)
        throw new ApiError('invalid_request', 400);
    return rule;
}

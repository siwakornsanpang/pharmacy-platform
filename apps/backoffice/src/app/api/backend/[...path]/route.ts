import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, requestMetadata } from '@/lib/api/server';
import { backendRoute, validateAccessMetadata, publicAccessResponse, requestForwardHeaders } from '@/lib/api/proxy-policy';
import { ApiError, apiPath } from '@/lib/api/types';
import { staffCookieName, clearStaffCookies } from '@/lib/auth/session';
import { validStaffMutation } from '@/lib/auth/csrf';
type Context = {
    params: Promise<{
        path: string[];
    }>;
};
async function handle(request: NextRequest, context: Context): Promise<NextResponse> {
    try {
        const { path: segments } = await context.params;
        // Check both the raw URL and Next's decoded parameters before normalization.
        apiPath('/' + segments.map(segment => encodeURIComponent(segment)).join('/'));
        const path = request.nextUrl.pathname.slice('/api/backend'.length) + request.nextUrl.search;
        const rule = backendRoute(path, request.method, request.headers);
        const body = await requestMetadata(request);
        let staffToken: string | undefined;
        if (!['GET', 'HEAD'].includes(request.method) && !validStaffMutation(request))
            throw new ApiError('invalid_request', 403);
        if (rule.actor === 'member')
            throw new ApiError('invalid_request', 401);
        if (rule.actor === 'staff') {
            staffToken = request.cookies.get(staffCookieName())?.value;
            if (!staffToken)
                throw new ApiError('invalid_request', 401);
        }
        validateAccessMetadata(path, request.method, body);
        const pathname = apiPath(path).split('?')[0];
        if (request.method === 'GET' && /^\/media\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/download$/i.test(pathname)) {
            const upstream = await backendFetch(path, {
                method: 'GET', staffToken, signal: request.signal, response: 'response',
            });
            if (upstream.status === 302) {
                const location = upstream.headers.get('location') ?? '';
                let url: URL;
                try { url = new URL(location); }
                catch { throw new ApiError('invalid_response'); }
                if (url.protocol !== 'https:' || url.username || url.password)
                    throw new ApiError('invalid_response');
                return new NextResponse(null, {
                    status: 302,
                    headers: { Location: location, 'Cache-Control': 'no-store' },
                });
            }
            throw new ApiError(upstream.status >= 400 && upstream.status < 500 ? 'invalid_request' : 'http', upstream.status);
        }
        const result = await backendFetch(path, {
            method: request.method, body, staffToken, signal: request.signal,
            headers: requestForwardHeaders(rule, request.headers),
        });
        if (result === undefined)
            return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
        return NextResponse.json(publicAccessResponse(path, request.method, result), { headers: { 'Cache-Control': 'no-store' } });
    }
    catch (error) {
        const status = error instanceof ApiError && error.status >= 400 && error.status < 500 ? error.status : 503;
        const response = NextResponse.json({ error: error instanceof ApiError ? error.kind : 'upstream_unavailable' }, { status, headers: { 'Cache-Control': 'no-store' } });
        if (status === 401)
            clearStaffCookies(response);
        return response;
    }
}
export { handle as GET, handle as POST, handle as PUT, handle as DELETE, handle as HEAD, handle as PATCH, handle as OPTIONS };

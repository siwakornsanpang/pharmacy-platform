import { NextRequest, NextResponse } from 'next/server';
import { backendFetch, requestMetadata } from '@/lib/api/server';
import { backendRoute } from '@/lib/api/proxy-policy';
import { ApiError, apiPath } from '@/lib/api/types';
import { getServerConfig } from '@/lib/config/server';
import { getAcademyMemberActor } from '@/lib/server/academy-bridge';
type Context = {
    params: Promise<{
        path: string[];
    }>;
};
const overrideKeys = ['owner', 'actor', 'kind', 'actorKey', 'uploadUrl', 'ticket', 'destination', 'pharmacistLicense', 'subject', 'displayName'];

function memberPayload(body: string | undefined, actor: { pharmacistLicense: string; displayName: string; subject: string }) {
    const parsed = body === undefined ? {} : JSON.parse(body) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        throw new ApiError('invalid_request', 400);
    if (overrideKeys.some(key => key in parsed))
        throw new ApiError('invalid_request', 400);
    return JSON.stringify({
        ...parsed,
        pharmacistLicense: actor.pharmacistLicense,
        displayName: actor.displayName,
        subject: actor.subject,
    });
}

async function forwardMemberAcademy(request: NextRequest, path: string, body: string | undefined): Promise<NextResponse> {
    const actor = getAcademyMemberActor(request);
    if (!actor)
        throw new ApiError('invalid_request', 401);
    if (request.method !== 'GET' && request.headers.get('origin') !== getServerConfig().appOrigin)
        throw new ApiError('invalid_request', 403);
    const normalized = apiPath(path);
    const pathname = normalized.split('?')[0];
    if (!pathname.startsWith('/academy/'))
        throw new ApiError('invalid_request', 401);
    const config = getServerConfig();
    const target = new URL(pathname, `${config.backendApiUrl}/`);
    if (request.method === 'GET')
        target.searchParams.set('license', actor.pharmacistLicense);
    const headers: Record<string, string> = { 'x-academy-bridge': config.academyBridgeKey };
    const idempotency = request.headers.get('idempotency-key');
    if (idempotency)
        headers['Idempotency-Key'] = idempotency;
    if (body !== undefined)
        headers['Content-Type'] = 'application/json';
    const response = await fetch(target, {
        method: request.method,
        headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : memberPayload(body, actor),
        cache: 'no-store',
        redirect: 'manual',
        signal: request.signal,
    });
    if (response.status === 302) {
        const location = response.headers.get('location') ?? '';
        if (!/^https:\/\/[^\s]+$/.test(location))
            throw new ApiError('invalid_response', 503);
        return new NextResponse(null, { status: 302, headers: { Location: location, 'Cache-Control': 'no-store' } });
    }
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status, headers: { 'Cache-Control': 'no-store' } });
}

async function handle(request: NextRequest, context: Context): Promise<NextResponse> {
    try {
        const { path: segments } = await context.params;
        // Check both the raw URL and Next's decoded parameters before normalization.
        apiPath('/' + segments.map(segment => encodeURIComponent(segment)).join('/'));
        const path = request.nextUrl.pathname.slice('/api/backend'.length) + request.nextUrl.search;
        const rule = backendRoute(path, request.method, request.headers);
        const body = await requestMetadata(request);
        if (rule.actor === 'member') {
            const pathname = apiPath(path).split('?')[0];
            if (!pathname.startsWith('/academy/'))
                throw new ApiError('invalid_request', 401);
            return await forwardMemberAcademy(request, path, body);
        }
        if (rule.actor !== 'public')
            throw new ApiError('invalid_request', 401);
        if (!['GET', 'HEAD'].includes(request.method))
            throw new ApiError('invalid_request', 403);
        const result = await backendFetch(path, { method: request.method, body, signal: request.signal });
        if (result === undefined)
            return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
        return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
    }
    catch (error) {
        const status = error instanceof ApiError && error.status >= 400 && error.status < 500 ? error.status : 503;
        const response = NextResponse.json({ error: error instanceof ApiError ? error.kind : 'upstream_unavailable' }, { status, headers: { 'Cache-Control': 'no-store' } });
        return response;
    }
}
export { handle as GET, handle as POST, handle as PUT, handle as DELETE, handle as HEAD, handle as PATCH, handle as OPTIONS };

import type { NextRequest } from 'next/server';
import { validStaffMutation } from '@/lib/auth/csrf';
import { authJson, backendJson, clearStaffCookies, cookieOptions, staffBackendFetch, staffCookieName, staffIdentity, StaffSessionError } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  if (!validStaffMutation(request)) return authJson({ message: 'Forbidden' }, 403);
  let input: unknown;
  try { input = await request.json(); }
  catch { return authJson({ message: 'Invalid request' }, 400); }
  const { username, password } = (input ?? {}) as Record<string, unknown>;
  if (typeof username !== 'string' || !username || typeof password !== 'string' || !password) {
    return authJson({ message: 'Invalid request' }, 400);
  }
  try {
    const upstream = await staffBackendFetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }),
    });
    if ([400, 401, 429].includes(upstream.status)) {
      return authJson({ message: upstream.status === 401 ? 'Invalid credentials' : 'Login rejected' }, upstream.status);
    }
    if (!upstream.ok) throw new StaffSessionError('unavailable');
    const value = await backendJson(upstream) as Record<string, unknown> | null;
    if (!value || value.success !== true || typeof value.token !== 'string' || !/^[^\s;\x00-\x1f\x7f]+$/.test(value.token) ||
      typeof value.expiresAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value.expiresAt)) {
      throw new StaffSessionError('invalid_response');
    }
    const expiry = new Date(value.expiresAt);
    if (!Number.isFinite(expiry.getTime()) || expiry.toISOString() !== value.expiresAt || expiry.getTime() <= Date.now()) {
      throw new StaffSessionError('invalid_response');
    }
    const response = clearStaffCookies(authJson(staffIdentity(value.user)));
    response.cookies.set(staffCookieName(), value.token, { ...cookieOptions(), expires: expiry });
    return response;
  } catch (error) {
    if (!(error instanceof StaffSessionError)) throw error;
    return authJson({ message: error.message }, error.status);
  }
}

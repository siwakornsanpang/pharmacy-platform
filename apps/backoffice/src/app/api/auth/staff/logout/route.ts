import type { NextRequest } from 'next/server';
import { validStaffMutation } from '@/lib/auth/csrf';
import { authJson, backendJson, clearStaffCookies, staffBackendFetch, staffCookieName, StaffSessionError } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  if (!validStaffMutation(request)) return authJson({ message: 'Forbidden' }, 403);
  try {
    const token = request.cookies.get(staffCookieName())?.value;
    if (!token) return clearStaffCookies(authJson({ message: 'No staff session to revoke' }, 401));
    const upstream = await staffBackendFetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    if (upstream.status === 401) return clearStaffCookies(authJson({ message: 'Staff session rejected' }, 401));
    if (!upstream.ok) throw new StaffSessionError('unavailable');
    const result = await backendJson(upstream) as Record<string, unknown> | null;
    if (!result || result.success !== true) throw new StaffSessionError('invalid_response');
    return clearStaffCookies(authJson({ success: true }));
  } catch (error) {
    if (!(error instanceof StaffSessionError)) throw error;
    return clearStaffCookies(authJson({ message: 'Local session cleared; remote revocation could not be confirmed' }, error.status));
  }
}

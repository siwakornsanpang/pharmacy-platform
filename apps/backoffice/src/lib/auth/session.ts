import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { isPermissionKey, type StaffIdentity } from '@pharmacy/contracts/access';
import { getServerConfig } from '../config/server';

export class StaffSessionError extends Error {
  readonly status = 503;
  constructor(public readonly reason: 'unavailable' | 'invalid_response') {
    super('Staff access temporarily unavailable');
    this.name = 'StaffSessionError';
  }
}

export function staffCookieName(): string {
  return cookieOptions().secure ? '__Host-pharmacy_staff' : 'pharmacy_staff';
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: new URL(getServerConfig().appOrigin).protocol === 'https:',
    sameSite: 'lax' as const,
    path: '/',
  };
}

export function authJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function clearStaffCookies(response: NextResponse) {
  for (const name of [staffCookieName(), 'auth_token', 'user_role', 'user_display_name', 'user_id']) {
    response.cookies.set(name, '', { ...cookieOptions(), expires: new Date(0), maxAge: 0 });
  }
  return response;
}

export async function staffBackendFetch(path: '/api/auth/login' | '/api/auth/me' | '/api/auth/logout', init: RequestInit = {}) {
  const { backendApiUrl } = getServerConfig();
  try {
    return await fetch(`${backendApiUrl}${path}`, {
      ...init, cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(5_000),
    });
  } catch {
    throw new StaffSessionError('unavailable');
  }
}

export async function backendJson(response: Response): Promise<unknown> {
  try { return await response.json(); }
  catch { throw new StaffSessionError('invalid_response'); }
}

export function staffIdentity(value: unknown): StaffIdentity {
  if (!value || typeof value !== 'object') throw new StaffSessionError('invalid_response');
  const identity = value as Record<string, unknown>;
  if (!Number.isSafeInteger(identity.id) || (identity.id as number) <= 0 ||
    typeof identity.username !== 'string' || !identity.username ||
    typeof identity.displayName !== 'string' || !identity.displayName ||
    typeof identity.role !== 'string' || !identity.role ||
    !Array.isArray(identity.permissions) || !identity.permissions.every(isPermissionKey)) {
    throw new StaffSessionError('invalid_response');
  }
  return {
    id: identity.id as number, username: identity.username, displayName: identity.displayName,
    role: identity.role, permissions: identity.permissions,
  };
}

export async function getVerifiedStaff(): Promise<StaffIdentity | null> {
  const token = (await cookies()).get(staffCookieName())?.value;
  if (!token) return null;
  const response = await staffBackendFetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 401) return null;
  if (!response.ok) throw new StaffSessionError('unavailable');
  return staffIdentity(await backendJson(response));
}

export async function requireVerifiedStaff(): Promise<StaffIdentity> {
  const user = await getVerifiedStaff();
  if (!user) redirect('/login');
  return user;
}

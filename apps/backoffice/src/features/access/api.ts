import type { PermissionKey, StaffIdentity } from '@pharmacy/contracts/access';
import { ApiError, decodeResponse, nativeRequest } from '@pharmacy/http';
import { browserApi } from '@/lib/api/browser';

export interface AssignableRole {
  role: string;
  permissionCount: number;
}

export interface StaffUser {
  id: number;
  username: string;
  displayName: string;
  role: string;
  createdAt: string;
  isActive?: boolean;
}

export interface CatalogPermission {
  id: number;
  key: PermissionKey;
  label: string;
  group: string | null;
}

async function staffAuth<T>(path: '/login' | '/logout', body?: unknown): Promise<T> {
  const csrf = await nativeRequest('/api/auth/staff/csrf', {}, 'same-origin', decodeResponse<{ csrfToken: string }>);
  if (!/^[a-f0-9]{64}$/.test(csrf.csrfToken)) throw new ApiError('invalid_response');
  return nativeRequest(`/api/auth/staff${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-csrf-token': csrf.csrfToken },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }, 'same-origin', (response) => decodeResponse<T>(response, 'POST'));
}

export function loginStaff(username: string, password: string): Promise<StaffIdentity> {
  return staffAuth('/login', { username, password });
}

export function logoutStaff(): Promise<{ success: true }> {
  return staffAuth('/logout');
}

export function listAssignableRoles(): Promise<AssignableRole[]> {
  return browserApi('/auth/assignable-roles');
}

export function listStaffUsers(): Promise<StaffUser[]> {
  return browserApi('/auth/users');
}

export function createStaffUser(input: { username: string; password: string; displayName: string; role: string }): Promise<{ success: true; user: StaffUser }> {
  return browserApi('/auth/users', { method: 'POST', body: JSON.stringify(input) });
}

export function deleteStaffUser(id: number): Promise<{ success: true; message?: string }> {
  return browserApi(`/auth/users/${id}`, { method: 'DELETE' });
}

export function listPermissions(): Promise<CatalogPermission[]> {
  return browserApi('/permissions');
}

export function listRoles(): Promise<AssignableRole[]> {
  return browserApi('/permissions/roles');
}

export function getRolePermissions(role: string): Promise<PermissionKey[]> {
  return browserApi(`/permissions/roles/${encodeURIComponent(role)}`);
}

export function createRole(role: string, permissions: PermissionKey[]): Promise<{ success: true; role: string }> {
  return browserApi('/permissions/roles', { method: 'POST', body: JSON.stringify({ role, permissions }) });
}

export function saveRolePermissions(role: string, permissions: PermissionKey[]): Promise<{ success: true; role: string; permissions: PermissionKey[] }> {
  return browserApi(`/permissions/roles/${encodeURIComponent(role)}`, { method: 'PUT', body: JSON.stringify({ permissions }) });
}

export function deleteRole(role: string): Promise<{ success: true }> {
  return browserApi(`/permissions/roles/${encodeURIComponent(role)}`, { method: 'DELETE' });
}

export function adminOnlyRoleLabel(role: string): string {
  return role === 'admin' ? 'admin' : role;
}

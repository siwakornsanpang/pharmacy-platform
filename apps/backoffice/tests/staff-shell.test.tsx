// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { CAPABILITY, type StaffIdentity } from '@pharmacy/contracts/access';
import { ApiError } from '@pharmacy/http';
import { StaffProvider } from '../src/features/access/StaffProvider';

const mocks = vi.hoisted(() => ({
  listAssignableRoles: vi.fn(),
  listStaffUsers: vi.fn(),
  createStaffUser: vi.fn(),
  saveRolePermissions: vi.fn(),
  listPermissions: vi.fn(),
  listRoles: vi.fn(),
  getRolePermissions: vi.fn(),
  createRole: vi.fn(),
  deleteRole: vi.fn(),
  deleteStaffUser: vi.fn(),
  swal: vi.fn(async () => ({ isConfirmed: true })),
}));

vi.mock('../src/features/access/api', () => ({
  listAssignableRoles: mocks.listAssignableRoles,
  listStaffUsers: mocks.listStaffUsers,
  createStaffUser: mocks.createStaffUser,
  saveRolePermissions: mocks.saveRolePermissions,
  listPermissions: mocks.listPermissions,
  listRoles: mocks.listRoles,
  getRolePermissions: mocks.getRolePermissions,
  createRole: mocks.createRole,
  deleteRole: mocks.deleteRole,
  deleteStaffUser: mocks.deleteStaffUser,
}));

vi.mock('sweetalert2', () => ({ default: { fire: mocks.swal } }));

const identity: StaffIdentity = {
  id: 2,
  username: 'delegate',
  displayName: 'Delegate',
  role: 'editor',
  permissions: [CAPABILITY.MANAGE_USERS, CAPABILITY.MANAGE_NEWS],
};

function wrap(node: React.ReactNode) {
  return <StaffProvider identity={identity}>{node}</StaffProvider>;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('manage_users_without_manage_roles_can_assign_only_allowed_roles', async () => {
  mocks.listStaffUsers.mockResolvedValue([]);
  mocks.listAssignableRoles.mockResolvedValue([{ role: 'editor', permissionCount: 1 }]);
  const { default: UserManagementPage } = await import('../src/app/backoffice/module/setting/users/page');
  render(wrap(<UserManagementPage />));
  fireEvent.click(await screen.findByRole('button', { name: /สร้างผู้ใช้ใหม่/ }));
  expect(screen.queryByRole('option', { name: 'admin' })).toBeNull();
  expect(screen.getByRole('option', { name: 'editor' })).toBeTruthy();
});

it('failed_role_assignment_does_not_show_success', async () => {
  mocks.listPermissions.mockResolvedValue([{ id: 1, key: CAPABILITY.MANAGE_NEWS, label: 'จัดการข่าวสาร', group: 'เว็บไซต์' }]);
  mocks.listRoles.mockResolvedValue([{ role: 'editor', permissionCount: 1 }]);
  mocks.getRolePermissions.mockResolvedValue([CAPABILITY.MANAGE_NEWS]);
  mocks.saveRolePermissions.mockRejectedValue(new ApiError('http', 403));
  const { default: PermissionsPage } = await import('../src/app/backoffice/module/setting/permissions/page');
  render(wrap(<PermissionsPage />));
  fireEvent.click(await screen.findByText((text, el) => el?.tagName === 'SPAN' && text === 'editor'));
  const save = await screen.findByRole('button', { name: /บันทึกสิทธิ์/ });
  expect(save).toHaveProperty('disabled', true);
  fireEvent.click(screen.getByRole('checkbox'));
  expect((await screen.findByRole('button', { name: /บันทึกสิทธิ์/ })).hasAttribute('disabled')).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: /บันทึกสิทธิ์/ }));
  await waitFor(() => expect(mocks.saveRolePermissions).toHaveBeenCalled());
  expect(JSON.stringify(mocks.swal.mock.calls)).not.toMatch(/"icon":"success"/);
  expect(mocks.swal).toHaveBeenCalledWith({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถทำรายการได้' });

});

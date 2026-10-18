// @vitest-environment jsdom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { CAPABILITY, type PermissionKey, type StaffIdentity } from '@pharmacy/contracts/access';
import { BIG_MODULES, MODULE_SUBMENUS, filterBigModules, filterMenuByPermission } from '../src/app/config/menu';
import { StaffProvider, useStaff } from '../src/features/access/StaffProvider';

const adminOnlyLabel = 'ตั้งค่า';
const parentLabel = 'บริการ';
const childLabel = 'ข่าวประชาสัมพันธ์';

function viewer(permissions: PermissionKey[]): StaffIdentity {
  return { id: 3, username: 'viewer', displayName: 'Viewer', role: 'viewer', permissions };
}

function MenuFromStaff() {
  const staff = useStaff();
  const modules = filterBigModules(BIG_MODULES, staff.permissions);
  const items = filterMenuByPermission(MODULE_SUBMENUS['council-web'], staff.permissions);
  return (
    <div>
      {modules.map((mod) => <div key={mod.id}>{mod.title}</div>)}
      {items.map((item) => <div key={item.id}>{item.title}</div>)}
    </div>
  );
}

it('only_child_permission_reveals_parent', () => {
  const items = filterMenuByPermission(MODULE_SUBMENUS['council-web'], [CAPABILITY.MANAGE_NEWS]);
  const modules = filterBigModules(BIG_MODULES, [CAPABILITY.MANAGE_NEWS]);
  render(
    <div>
      {modules.map((mod) => <div key={mod.id}>{mod.title}</div>)}
      {items.map((item) => <div key={item.id}>{item.title}</div>)}
    </div>,
  );
  expect(screen.getByText(parentLabel)).toBeTruthy();
  expect(screen.getByText(childLabel)).toBeTruthy();
  expect(screen.getByText('เว็บไซต์สภา')).toBeTruthy();
  expect(screen.queryByText('จัดการหน้าแรก')).toBeNull();
  expect(screen.queryByText(adminOnlyLabel)).toBeNull();
});

it('role_cookie_cannot_open_admin_menu', () => {
  document.cookie = 'user_role=admin; auth_token=forged-admin-token; path=/';
  render(
    <StaffProvider identity={viewer([])}>
      <MenuFromStaff />
    </StaffProvider>,
  );
  expect(screen.queryByText(adminOnlyLabel)).toBeNull();
  expect(screen.queryByText('Pharmacy Academy')).toBeNull();
  expect(screen.queryByText('จัดการผู้ใช้')).toBeNull();
});

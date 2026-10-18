// ============================================
// Role Configuration
// ============================================
// Built-in roles มี config สำหรับ styling
// Dynamic roles จะใช้ default config

export interface RoleConfig {
  label: string;       // English label
  labelTh: string;     // Thai label
  color: string;       // Badge text color
  bg: string;          // Badge background color
  defaultPage: string; // หน้าแรกหลัง login
}

// Config สำหรับ built-in roles (ใช้แค่เรื่อง styling)
const BUILT_IN_ROLES: Record<string, RoleConfig> = {
  admin: {
    label: 'Admin',
    labelTh: 'ผู้ดูแลระบบ',
    color: '#ef4444',
    bg: '#fef2f2',
    defaultPage: '/backoffice',
  },
  editor: {
    label: 'Editor',
    labelTh: 'ผู้แก้ไข',
    color: '#f59e0b',
    bg: '#fffbeb',
    defaultPage: '/backoffice/module/council-web/home',
  },
  web_editor: {
    label: 'Web Editor',
    labelTh: 'ผู้จัดการเว็บสภา',
    color: '#3b82f6',
    bg: '#eff6ff',
    defaultPage: '/backoffice/module/council-web/home',
  },
  viewer: {
    label: 'Viewer',
    labelTh: 'ผู้ดู',
    color: '#6b7280',
    bg: '#f9fafb',
    defaultPage: '/backoffice/module/council-web/home',
  },
};

// Default config สำหรับ role ที่สร้างใหม่ (dynamic roles)
const DEFAULT_ROLE_CONFIG: RoleConfig = {
  label: '',
  labelTh: '',
  color: '#8b5cf6',
  bg: '#f5f3ff',
  defaultPage: '/backoffice',
};

// --- Helper functions ---

/** ดึง config ของ role (ถ้าไม่ใช่ built-in จะใช้ default + ชื่อ role เป็น label) */
export function getRoleConfig(role: string): RoleConfig {
  if (BUILT_IN_ROLES[role]) return BUILT_IN_ROLES[role];
  return {
    ...DEFAULT_ROLE_CONFIG,
    label: role,
    labelTh: role,
  };
}

/** ดึง label — ใช้ labelTh ถ้ามี, ไม่งั้นใช้ชื่อ role */
export function getRoleLabel(role: string): string {
  return getRoleConfig(role).labelTh || role;
}

/** ดึงหน้าแรกของ role */
export function getDefaultPage(role: string): string {
  return getRoleConfig(role).defaultPage;
}

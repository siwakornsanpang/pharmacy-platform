export const CAPABILITY = {
  MANAGE_HOME: "manage_home",
  MANAGE_NEWS: "manage_news",
  MANAGE_COUNCIL: "manage_council",
  MANAGE_HISTORY: "manage_history",
  MANAGE_AGENCY: "manage_agency",
  MANAGE_LAW: "manage_law",
  MANAGE_WEB_SETTINGS: "manage_web_settings",
  MANAGE_REGISTER: "manage_register",
  VIEW_DASHBOARD: "view_dashboard",
  MANAGE_USERS: "manage_users",
  MANAGE_ROLES: "manage_roles",
  MANAGE_ABOUT: "manage_about",
  MANAGE_PRODUCT: "manage_product",
  MANAGE_SERVICE: "manage_service",
  MANAGE_OTHER_SERVICE: "manage_other_service",
  MANAGE_ACADEMY: "manage_academy",
  MANAGE_WEB_PHARMACIST: "manage_web_pharmacist",
  MANAGE_ROYALCOLLEGE: "manage_royalcollege",
  MANAGE_ESERVICE: "manage_eservice",
  MANAGE_TRAN: "manage_tran",
} as const;

export type PermissionKey = typeof CAPABILITY[keyof typeof CAPABILITY];

export interface CapabilityDefinition {
  readonly key: PermissionKey;
  readonly label: string;
  readonly group: string | null;
  readonly order: number;
}

export const capabilityCatalog: readonly CapabilityDefinition[] = Object.freeze([
  Object.freeze({ key: CAPABILITY.MANAGE_HOME, label: "จัดการหน้าแรก", group: "เว็บไซต์", order: 0 }),
  Object.freeze({ key: CAPABILITY.MANAGE_NEWS, label: "จัดการข่าวสาร", group: "เว็บไซต์", order: 1 }),
  Object.freeze({ key: CAPABILITY.MANAGE_COUNCIL, label: "จัดการกรรมการสภา", group: "เว็บไซต์", order: 2 }),
  Object.freeze({ key: CAPABILITY.MANAGE_HISTORY, label: "จัดการทำเนียบ", group: "เว็บไซต์", order: 3 }),
  Object.freeze({ key: CAPABILITY.MANAGE_AGENCY, label: "จัดการหน่วยงาน", group: "เว็บไซต์", order: 4 }),
  Object.freeze({ key: CAPABILITY.MANAGE_LAW, label: "จัดการกฎหมาย", group: "เว็บไซต์", order: 5 }),
  Object.freeze({ key: CAPABILITY.MANAGE_WEB_SETTINGS, label: "ตั้งค่าเว็บไซต์", group: "เว็บไซต์", order: 6 }),
  Object.freeze({ key: CAPABILITY.MANAGE_REGISTER, label: "จัดการทะเบียน", group: "ระบบ", order: 7 }),
  Object.freeze({ key: CAPABILITY.VIEW_DASHBOARD, label: "ดู Dashboard", group: "ระบบ", order: 8 }),
  Object.freeze({ key: CAPABILITY.MANAGE_USERS, label: "จัดการผู้ใช้", group: "ระบบ", order: 9 }),
  Object.freeze({ key: CAPABILITY.MANAGE_ROLES, label: "จัดการสิทธิ์", group: "ระบบ", order: 10 }),
  Object.freeze({ key: CAPABILITY.MANAGE_ABOUT, label: "จัดการเกี่ยวกับองค์กร", group: "เว็บไซต์", order: 11 }),
  Object.freeze({ key: CAPABILITY.MANAGE_PRODUCT, label: "จัดการสินค้า", group: "เว็บไซต์", order: 12 }),
  Object.freeze({ key: CAPABILITY.MANAGE_SERVICE, label: "จัดการบริการ", group: "เว็บไซต์", order: 13 }),
  Object.freeze({ key: CAPABILITY.MANAGE_OTHER_SERVICE, label: "จัดการบริการอื่นๆ", group: "เว็บไซต์", order: 14 }),
  Object.freeze({ key: CAPABILITY.MANAGE_ACADEMY, label: "Pharmacy Academy", group: "Academy", order: 15 }),
  Object.freeze({ key: CAPABILITY.MANAGE_WEB_PHARMACIST, label: "เว็บไซต์เภสัชกร", group: "เว็บไซต์", order: 16 }),
  Object.freeze({ key: CAPABILITY.MANAGE_ROYALCOLLEGE, label: "ราชวิทยาลัย", group: "ระบบ", order: 17 }),
  Object.freeze({ key: CAPABILITY.MANAGE_ESERVICE, label: "E-Service", group: "ระบบ", order: 18 }),
  Object.freeze({ key: CAPABILITY.MANAGE_TRAN, label: "การเงิน / ธุรกรรม", group: "ระบบ", order: 19 }),
]);

const permissionKeys = new Set<string>(capabilityCatalog.map(({ key }) => key));

export function isPermissionKey(value: unknown): value is PermissionKey {
  return typeof value === "string" && permissionKeys.has(value);
}

export interface StaffIdentity {
  id: number;
  username: string;
  displayName: string;
  role: string;
  permissions: PermissionKey[];
}

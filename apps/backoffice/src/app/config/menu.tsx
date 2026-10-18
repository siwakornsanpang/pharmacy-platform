import {
  Globe,
  BookOpen,
  IdCard,
  GraduationCap,
  Monitor,
  CreditCard,
  Settings,
  LayoutGrid,
  Landmark,
  Megaphone,
  Folder,
  Users,
  Scale,
  Briefcase,
  School,
  ShoppingBag,
  ShieldCheck,
  Armchair,
  Award,
  FileText,
  Tags,
  Star,
  Receipt,
  Undo2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { CAPABILITY, type PermissionKey } from '@pharmacy/contracts/access';

// ============================================
// Menu Config — Big modules + submenus
// ============================================

export interface MenuItem {
  id: string;
  title: string;
  icon?: ReactNode;
  href?: string;
  submenu?: MenuItem[];
  isHeader?: boolean;
  permission?: PermissionKey;
}

export type BigModuleId =
  | 'council-web'
  | 'pharmacist-web'
  | 'register'
  | 'academy'
  | 'royalcollege'
  | 'e-service'
  | 'bill'
  | 'setting';

export interface BigModule {
  id: BigModuleId;
  title: string;
  icon: ReactNode;
  href: string;
  pathPrefix: string;
  permission?: PermissionKey;
}

export function filterMenuByPermission(items: MenuItem[], permissions: readonly PermissionKey[]): MenuItem[] {
  return items.flatMap((item) => {
    const children = item.submenu ? filterMenuByPermission(item.submenu, permissions) : [];
    const allowed = !item.permission || permissions.includes(item.permission);
    if (children.length > 0) return [{ ...item, submenu: children }];
    if (allowed && !item.submenu?.length) return [item];
    return [];
  });
}

export function filterBigModules(modules: BigModule[], permissions: readonly PermissionKey[]): BigModule[] {
  return modules.filter((mod) => {
    if (!mod.permission || permissions.includes(mod.permission)) return true;
    return filterMenuByPermission(MODULE_SUBMENUS[mod.id] ?? [], permissions).length > 0;
  });
}

/** Module ใหญ่ — หน้า hub */
export const BIG_MODULES: BigModule[] = [
  {
    id: 'council-web',
    title: 'เว็บไซต์สภา',
    icon: <Globe size={36} strokeWidth={1.6} />,
    href: '/backoffice/module/council-web/home',
    pathPrefix: '/backoffice/module/council-web',
    permission: CAPABILITY.MANAGE_HOME,
  },
  {
    id: 'pharmacist-web',
    title: 'เว็บไซต์เภสัชกร',
    icon: <BookOpen size={36} strokeWidth={1.6} />,
    href: '/backoffice/module/pharmacist-web/home',
    pathPrefix: '/backoffice/module/pharmacist-web',
    permission: CAPABILITY.MANAGE_WEB_PHARMACIST,
  },
  {
    id: 'register',
    title: 'ทะเบียนเภสัช',
    icon: <IdCard size={36} strokeWidth={1.6} />,
    href: '/backoffice/module/register/list',
    pathPrefix: '/backoffice/module/register',
    permission: CAPABILITY.MANAGE_REGISTER,
  },
  {
    id: 'academy',
    title: 'Pharmacy Academy',
    icon: <School size={36} strokeWidth={1.6} />,
    href: '/backoffice/module/academy/categories',
    pathPrefix: '/backoffice/module/academy',
    permission: CAPABILITY.MANAGE_ACADEMY,
  },
  {
    id: 'royalcollege',
    title: 'ราชวิทยาลัย',
    icon: <GraduationCap size={36} strokeWidth={1.6} />,
    href: '/backoffice/module/royalcollege/management',
    pathPrefix: '/backoffice/module/royalcollege',
    permission: CAPABILITY.MANAGE_ROYALCOLLEGE,
  },
  {
    id: 'e-service',
    title: 'E-Service',
    icon: <Monitor size={36} strokeWidth={1.6} />,
    href: '/backoffice/module/e-service/services',
    pathPrefix: '/backoffice/module/e-service',
    permission: CAPABILITY.MANAGE_ESERVICE,
  },
  {
    id: 'bill',
    title: 'การเงิน / ธุรกรรม',
    icon: <CreditCard size={36} strokeWidth={1.6} />,
    href: '/backoffice/module/bill/transactions',
    pathPrefix: '/backoffice/module/bill',
    permission: CAPABILITY.MANAGE_TRAN,
  },
  {
    id: 'setting',
    title: 'ตั้งค่า',
    icon: <Settings size={36} strokeWidth={1.6} />,
    href: '/backoffice/module/setting/users',
    pathPrefix: '/backoffice/module/setting',
    permission: CAPABILITY.MANAGE_USERS,
  },
];

/** Module ย่อย — ใช้ใน sidebar ตาม module ใหญ่ที่เลือก */
export const MODULE_SUBMENUS: Record<BigModuleId, MenuItem[]> = {
  'council-web': [
    {
      id: 'cw-home',
      title: 'จัดการหน้าแรก',
      icon: <LayoutGrid size={18} />,
      href: '/backoffice/module/council-web/home',
      permission: CAPABILITY.MANAGE_HOME,
    },
    {
      id: 'cw-about',
      title: 'เกี่ยวกับองค์กร',
      icon: <Landmark size={18} />,
      href: '/backoffice/module/council-web/about/council',
      permission: CAPABILITY.MANAGE_ABOUT,
      submenu: [
        {
          id: 'cw-about-council',
          title: 'กรรมการสภา',
          icon: <Users size={16} />,
          href: '/backoffice/module/council-web/about/council',
          permission: CAPABILITY.MANAGE_ABOUT,
        },
        {
          id: 'cw-about-history',
          title: 'ทำเนียบสภา',
          icon: <Armchair size={16} />,
          href: '/backoffice/module/council-web/about/history',
          permission: CAPABILITY.MANAGE_ABOUT,
        },
        {
          id: 'cw-about-honor',
          title: 'เกียรติประวัติ',
          icon: <Award size={16} />,
          href: '/backoffice/module/council-web/about/honor',
          permission: CAPABILITY.MANAGE_ABOUT,
        },
        {
          id: 'cw-about-policy',
          title: 'นโยบายสภา',
          icon: <FileText size={16} />,
          href: '/backoffice/module/council-web/about/policy',
          permission: CAPABILITY.MANAGE_ABOUT,
        },
      ],
    },
    {
      id: 'cw-news',
      title: 'ข่าวประชาสัมพันธ์',
      icon: <Megaphone size={18} />,
      href: '/backoffice/module/council-web/news',
      permission: CAPABILITY.MANAGE_NEWS,
    },
    {
      id: 'cw-service',
      title: 'บริการ',
      icon: <Folder size={18} />,
      href: '/backoffice/module/council-web/service/medicine',
      submenu: [
        {
          id: 'cw-svc-medicine',
          title: 'ความรู้เรื่องยา',
          icon: <BookOpen size={16} />,
          href: '/backoffice/module/council-web/service/medicine',
          permission: CAPABILITY.MANAGE_NEWS,
        },
        {
          id: 'cw-svc-public',
          title: 'โครงการของประชาชน',
          icon: <Users size={16} />,
          href: '/backoffice/module/council-web/service/public-project',
          permission: CAPABILITY.MANAGE_NEWS,
        },
        {
          id: 'cw-svc-eservice',
          title: 'E-service',
          icon: <Monitor size={16} />,
          href: '/backoffice/module/council-web/service/e-service',
          permission: CAPABILITY.MANAGE_SERVICE,
        },
      ],
    },
    {
      id: 'cw-agency',
      title: 'หน่วยงาน',
      icon: <Users size={18} />,
      href: '/backoffice/module/council-web/agency',
      permission: CAPABILITY.MANAGE_AGENCY,
    },
    {
      id: 'cw-law',
      title: 'กฎหมาย',
      icon: <Scale size={18} />,
      href: '/backoffice/module/council-web/law',
      permission: CAPABILITY.MANAGE_LAW,
    },
    {
      id: 'cw-other',
      title: 'บริการอื่นๆ',
      icon: <Briefcase size={18} />,
      href: '/backoffice/module/council-web/other-service',
      permission: CAPABILITY.MANAGE_OTHER_SERVICE,
    },
    {
      id: 'cw-setting',
      title: 'ตั้งค่าเว็บไซต์',
      icon: <Settings size={18} />,
      href: '/backoffice/module/council-web/setting',
      permission: CAPABILITY.MANAGE_WEB_SETTINGS,
    },
  ],
  'pharmacist-web': [
    {
      id: 'pw-home',
      title: 'จัดการหน้าแรก',
      icon: <LayoutGrid size={18} />,
      href: '/backoffice/module/pharmacist-web/home',
      permission: CAPABILITY.MANAGE_HOME,
    },
    {
      id: 'pw-product',
      title: 'สินค้าสภา',
      icon: <ShoppingBag size={18} />,
      href: '/backoffice/module/pharmacist-web/product',
      permission: CAPABILITY.MANAGE_PRODUCT,
    },
  ],
  register: [
    {
      id: 'reg-list',
      title: 'ทะเบียนเภสัช',
      icon: <IdCard size={18} />,
      href: '/backoffice/module/register/list',
      permission: CAPABILITY.MANAGE_REGISTER,
    },
  ],
  academy: [
    {
      id: 'academy-categories',
      title: 'หมวดหมู่',
      icon: <Tags size={18} />,
      href: '/backoffice/module/academy/categories',
      permission: CAPABILITY.MANAGE_ACADEMY,
    },
    {
      id: 'academy-instructors',
      title: 'วิทยากร',
      icon: <Users size={18} />,
      href: '/backoffice/module/academy/instructors',
      permission: CAPABILITY.MANAGE_ACADEMY,
    },
    {
      id: 'academy-courses',
      title: 'คอร์สเรียน',
      icon: <BookOpen size={18} />,
      href: '/backoffice/module/academy/courses',
      permission: CAPABILITY.MANAGE_ACADEMY,
    },
    {
      id: 'academy-reviews',
      title: 'รีวิว',
      icon: <Star size={18} />,
      href: '/backoffice/module/academy/reviews',
      permission: CAPABILITY.MANAGE_ACADEMY,
    },
    {
      id: 'academy-learners',
      title: 'ผู้เรียน',
      icon: <GraduationCap size={18} />,
      href: '/backoffice/module/academy/learners',
      permission: CAPABILITY.MANAGE_ACADEMY,
    },
    {
      id: 'academy-orders',
      title: 'การชำระเงิน',
      icon: <Receipt size={18} />,
      href: '/backoffice/module/academy/orders',
      permission: CAPABILITY.MANAGE_ACADEMY,
    },
    {
      id: 'academy-refunds',
      title: 'คำขอคืนเงิน',
      icon: <Undo2 size={18} />,
      href: '/backoffice/module/academy/refunds',
      permission: CAPABILITY.MANAGE_ACADEMY,
    },
    {
      id: 'academy-cpe',
      title: 'รายงาน CPE',
      icon: <FileText size={18} />,
      href: '/backoffice/module/academy/cpe',
      permission: CAPABILITY.MANAGE_ACADEMY,
    },
  ],
  royalcollege: [
    {
      id: 'rc-mgmt',
      title: 'จัดการราชวิทยาลัย',
      icon: <GraduationCap size={18} />,
      href: '/backoffice/module/royalcollege/management',
      permission: CAPABILITY.MANAGE_ROYALCOLLEGE,
    },
  ],
  'e-service': [
    {
      id: 'es-services',
      title: 'E-Service',
      icon: <Monitor size={18} />,
      href: '/backoffice/module/e-service/services',
      permission: CAPABILITY.MANAGE_ESERVICE,
    },
  ],
  bill: [
    {
      id: 'bill-tx',
      title: 'การเงิน / ธุรกรรม',
      icon: <CreditCard size={18} />,
      href: '/backoffice/module/bill/transactions',
      permission: CAPABILITY.MANAGE_TRAN,
    },
  ],
  setting: [
    {
      id: 'set-users',
      title: 'จัดการผู้ใช้',
      icon: <Users size={18} />,
      href: '/backoffice/module/setting/users',
      permission: CAPABILITY.MANAGE_USERS,
    },
    {
      id: 'set-perms',
      title: 'จัดการสิทธิ์',
      icon: <ShieldCheck size={18} />,
      href: '/backoffice/module/setting/permissions',
      permission: CAPABILITY.MANAGE_ROLES,
    },
  ],
};

/** หา module ใหญ่จาก pathname */
export function getActiveBigModule(pathname: string): BigModule | null {
  const sorted = [...BIG_MODULES].sort(
    (a, b) => b.pathPrefix.length - a.pathPrefix.length
  );
  return sorted.find((m) => pathname === m.pathPrefix || pathname.startsWith(m.pathPrefix + '/')) ?? null;
}

export function isBackofficeHub(pathname: string): boolean {
  return pathname === '/backoffice' || pathname === '/backoffice/';
}

/** เดิม sidebar แสดง module ใหญ่ — เก็บไว้เผื่อ fallback */
export const SIDEBAR_DATA: MenuItem[] = BIG_MODULES.map((m) => ({
  id: `${m.id}-hub`,
  title: m.title,
  href: m.href,
  icon: m.icon,
  permission: m.permission,
}));

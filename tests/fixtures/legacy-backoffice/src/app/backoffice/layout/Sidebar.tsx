"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronRight, LogOut, User } from "lucide-react";
import Cookies from "js-cookie";
import {
  MODULE_SUBMENUS,
  filterMenuByPermission,
  getActiveBigModule,
  type MenuItem,
} from "@/app/config/menu";
import styles from "./Sidebar.module.css";
import { authFetch } from "@/app/utils/authFetch";
import { SkeletonMenu } from "@/app/components/ui/Skeleton";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface SidebarProps {
  isOpen: boolean;
  userRole: string;
  userName: string;
}

function pathMatches(pathname: string, href?: string) {
  if (!href) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function itemOrChildActive(pathname: string, item: MenuItem): boolean {
  if (pathMatches(pathname, item.href)) return true;
  return Boolean(item.submenu?.some((child) => itemOrChildActive(pathname, child)));
}

export default function Sidebar({ isOpen, userRole, userName }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  const activeModule = getActiveBigModule(pathname);
  const rawItems: MenuItem[] = activeModule
    ? MODULE_SUBMENUS[activeModule.id] ?? []
    : [];

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        if (userRole === "admin") {
          setUserPermissions([]);
          setPermissionsLoaded(true);
          return;
        }
        const res = await authFetch(`${API_URL}/permissions/my`);
        if (res.ok) {
          const data = await res.json();
          setUserPermissions(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to fetch permissions:", err);
      } finally {
        setPermissionsLoaded(true);
      }
    };

    fetchPermissions();
  }, [userRole]);

  const visibleMenuItems =
    userRole === "admin"
      ? rawItems
      : filterMenuByPermission(rawItems, userPermissions);

  const handleLogout = () => {
    Cookies.remove("auth_token", { path: "/" });
    Cookies.remove("user_role", { path: "/" });
    Cookies.remove("user_display_name", { path: "/" });
    Cookies.remove("user_id", { path: "/" });
    router.refresh();
    router.replace("/login");
  };

  return (
    <aside
      className={styles.sidebar}
      style={{
        transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.3s ease-in-out",
        visibility: isOpen ? "visible" : "hidden",
      }}
    >
      <div className={styles.sidebarContent}>
        {!permissionsLoaded ? (
          <SkeletonMenu rows={6} />
        ) : visibleMenuItems.length === 0 ? (
          <div className={styles.emptyHint}>ไม่มีเมนูย่อย</div>
        ) : (
          visibleMenuItems.map((item) => (
            <SidebarItem key={item.id} item={item} />
          ))
        )}
      </div>

      <div className={styles.sidebarFooter}>
        <div className={styles.userProfile}>
          <div className={styles.avatar}>
            <User size={22} strokeWidth={2} />
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>
              {userName && userName !== "User" && userName !== "ผู้ดูแลระบบ"
                ? userName
                : "Administrator"}
            </span>
            <span className={styles.userRole}>
              {userRole?.toLowerCase() === "admin"
                ? "ผู้ดูแลระบบ"
                : userRole?.toLowerCase() === "editor"
                  ? "ผู้แก้ไขข้อมูล"
                  : "ผู้ดูแลระบบ"}
            </span>
          </div>
          <button
            className={styles.logoutBtn}
            onClick={handleLogout}
            title="ออกจากระบบ"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function SidebarItem({ item, depth = 0 }: { item: MenuItem; depth?: number }) {
  const pathname = usePathname();
  const hasChildren = Boolean(item.submenu && item.submenu.length > 0);
  const childActive = itemOrChildActive(pathname, item);
  const [open, setOpen] = useState(childActive);

  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  const href = item.href || "#";
  const isExactActive = pathMatches(pathname, href) && !hasChildren;
  const isGroupActive = hasChildren && childActive;

  if (hasChildren) {
    return (
      <div className={`${styles.itemWrapper} ${open ? styles.expandedGroup : ""}`}>
        <button
          type="button"
          className={`${styles.menuItem} ${isGroupActive ? styles.groupActive : ""}`}
          style={{ paddingLeft: depth === 0 ? "12px" : "18px" }}
          title={item.title}
          onClick={() => setOpen((v) => !v)}
        >
          <div className={styles.labelContainer}>
            {item.icon && <span className={styles.icon}>{item.icon}</span>}
            <span className={styles.labelText}>{item.title}</span>
          </div>
          <span className={styles.chevron}>
            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </button>
        {open && (
          <div className={styles.submenuContainer}>
            {item.submenu!.map((child) => (
              <SidebarItem key={child.id} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.itemWrapper}>
      <Link href={href} className={styles.menuLink}>
        <div
          className={`${styles.menuItem} ${isExactActive ? styles.active : ""} ${depth > 0 ? styles.subItem : ""}`}
          style={{ paddingLeft: depth === 0 ? "12px" : "14px" }}
          title={item.title}
        >
          <div className={styles.labelContainer}>
            {item.icon && (
              <span
                className={`${styles.icon} ${isExactActive ? styles.iconActive : ""}`}
              >
                {item.icon}
              </span>
            )}
            <span className={styles.labelText}>{item.title}</span>
          </div>
        </div>
      </Link>
    </div>
  );
}

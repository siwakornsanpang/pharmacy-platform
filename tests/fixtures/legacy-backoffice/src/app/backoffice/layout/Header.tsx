"use client";

import React, { useState } from "react";
import { ArrowLeft, ChevronDown, Menu, Search, User } from "lucide-react";
import styles from "./Header.module.css";
import Link from "next/link";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { getActiveBigModule } from "@/app/config/menu";
import { usePathname } from "next/navigation";

interface HeaderProps {
  onToggle: () => void;
  userName: string;
  userRole: string;
  variant?: "hub" | "module";
}

export default function Header({
  onToggle,
  userName,
  userRole,
  variant = "module",
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const isHub = variant === "hub";
  const activeModule = !isHub ? getActiveBigModule(pathname) : null;

  const handleLogout = () => {
    Cookies.remove("auth_token", { path: "/" });
    Cookies.remove("user_role", { path: "/" });
    Cookies.remove("user_display_name", { path: "/" });
    Cookies.remove("user_id", { path: "/" });
    router.refresh();
    router.replace("/login");
  };

  const onSearchChange = (value: string) => {
    window.dispatchEvent(new CustomEvent("bo-hub-search", { detail: value }));
  };

  return (
    <header className={styles.header}>
      <div className={styles.leftSection}>
        {!isHub && (
          <button
            className={styles.toggleBtn}
            title="Toggle Sidebar"
            onClick={onToggle}
            type="button"
          >
            <Menu size={24} />
          </button>
        )}
        <Link
          href="/backoffice"
          className={styles.brandContainer}
          style={{ textDecoration: "none" }}
        >
          <img src="/favicon.ico" alt="Logo" className={styles.logoImage} />
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>ระบบ สภาเภสัชกรรม</span>
          </div>
        </Link>
        {!isHub && (
          <Link href="/backoffice" className={styles.backBtn}>
            <ArrowLeft size={16} />
            <span>กลับหน้าหลัก</span>
            {activeModule && (
              <span className={styles.backModuleTag}>{activeModule.title}</span>
            )}
          </Link>
        )}
      </div>

      <div className={styles.centerSection}>
        <div className={styles.searchBox}>
          <Search size={15} />
          <input
            aria-label="ค้นหาเมนู รายการ หรือผู้ใช้งาน"
            placeholder="ค้นหาเมนู, รายการ, ผู้ใช้งาน..."
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.rightSection}>
        <div
          className={styles.userProfile}
          onClick={() => setShowProfileMenu(!showProfileMenu)}
          title="โปรไฟล์ผู้ใช้งาน"
        >
          <div className={styles.avatar}>
            <User size={20} />
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>
              {userRole?.toLowerCase() === "admin" ? "ผู้ดูแลระบบ" : "ผู้ใช้งาน"}
            </span>
            <span className={styles.userRole}>
              {userName && userName !== "User" && userName !== "ผู้ดูแลระบบ"
                ? userName
                : "Administrator"}
            </span>
          </div>
          <ChevronDown size={16} className={styles.chevronIcon} />

          {showProfileMenu && (
            <div
              className={styles.dropdownMenu}
              onClick={(e) => e.stopPropagation()}
            >
              <button className={styles.dropdownItem} onClick={handleLogout}>
                ออกจากระบบ
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

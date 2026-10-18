"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import styles from "./MemberNavbar.module.css";

type NavLink =
    | { name: string; href: string; children?: undefined }
    | {
          name: string;
          href: string;
          children: { name: string; href: string }[];
      };

const memberLinks: NavLink[] = [
    { name: "หน้าแรก", href: "/home" },
    { name: "ข้อมูลของฉัน", href: "/profile" },
    {
        name: "E-Service",
        href: "/service",
        children: [
            { name: "ยื่นคำขอ", href: "/service" },
            { name: "ประวัติคำขอ", href: "/service/e-service/sap-33/history" },
        ],
    },
    { name: "งานประชุม", href: "/meeting" },
    { name: "Pharmacy Academy", href: "/learning" },
    { name: "สินค้าสภาเภสัชกรรม", href: "/store" },
];

function isLinkActive(pathname: string, href: string) {
    if (href === "/home") return pathname === "/" || pathname === "/home";
    if (href === "/service") {
        return pathname === "/service" || pathname.startsWith("/service/");
    }
    return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MemberNavbar() {
    const pathname = usePathname();
    const { userName, userId, logout } = useAuth();
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setOpenDropdown(null);
    }, [pathname]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <nav className={`${styles.navbar} ThaiFont`}>
            <div className={styles.topBanner}>
                <div className={styles.brandArea}>
                    <Image
                        src="/images/public/icon.jpg"
                        alt="Logo"
                        width={40}
                        height={40}
                        className={styles.logo}
                    />
                    <div>
                        <h1 className={styles.brandTitle}>สภาเภสัชกรรม</h1>
                        <p className={styles.brandSubtitle}>The Pharmacy Council of Thailand</p>
                    </div>

                    <div className={styles.navDivider}></div>
                    <h2 className={styles.systemName}>ระบบบริการผู้ประกอบวิชาชีพเภสัชกรรม</h2>
                </div>

                <div className={styles.actionsArea}>
                    <div className={styles.langSwitch}>
                        <svg
                            className={styles.langSwitchIcon}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                            />
                        </svg>
                        <span className={styles.langSwitchText}>TH</span>
                    </div>

                    <div className={styles.userArea}>
                        <div className={styles.userInfo}>
                            <div className={styles.userDetails}>
                                <span className={styles.userGreeting}>สวัสดี {userName}</span>
                                <span className={styles.userID}>{userId}</span>
                            </div>
                            <div className={styles.avatarWrapper}>
                                <Image
                                    src="/images/public/member/image.png"
                                    alt="Avatar"
                                    width={40}
                                    height={40}
                                    className={styles.userAvatar}
                                />
                            </div>
                        </div>
                        <button className={styles.logoutBtn} onClick={logout} title="ออกจากระบบ">
                            <LogOut size={14} />
                            <span>ออกจากระบบ</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.lowerNav}>
                <div className={styles.navContainer}>
                    {memberLinks.map((link) => {
                        const isActive = isLinkActive(pathname, link.href);

                        if (link.children) {
                            const isOpen = openDropdown === link.name;
                            return (
                                <div
                                    key={link.name}
                                    className={styles.dropdownWrap}
                                    ref={dropdownRef}
                                >
                                    <button
                                        type="button"
                                        className={`${isActive ? styles.navItemActive : styles.navItem} ${styles.dropdownTrigger} ThaiFont`}
                                        aria-expanded={isOpen}
                                        aria-haspopup="menu"
                                        onClick={() =>
                                            setOpenDropdown(isOpen ? null : link.name)
                                        }
                                    >
                                        {link.name}
                                        <ChevronDown
                                            size={14}
                                            className={`${styles.dropdownChevron} ${isOpen ? styles.dropdownChevronOpen : ""}`}
                                        />
                                        {isActive && <div className={styles.activeIndicator} />}
                                    </button>

                                    {isOpen && (
                                        <div className={styles.dropdownMenu} role="menu">
                                            {link.children.map((child) => {
                                                const childActive =
                                                    child.href === "/service"
                                                        ? pathname === "/service"
                                                        : pathname === child.href ||
                                                          pathname.startsWith(`${child.href}/`);
                                                return (
                                                    <Link
                                                        key={child.href}
                                                        href={child.href}
                                                        role="menuitem"
                                                        className={`${styles.dropdownItem} ${childActive ? styles.dropdownItemActive : ""} ThaiFont`}
                                                        onClick={() => setOpenDropdown(null)}
                                                    >
                                                        {child.name}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`${isActive ? styles.navItemActive : styles.navItem} ThaiFont`}
                            >
                                {link.name}
                                {isActive && <div className={styles.activeIndicator} />}
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}

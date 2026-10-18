"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import styles from "./Navbar.module.css";
import { getWebSettings } from "@/features/content/browser-api";

interface NavLink {
    name: string;
    href: string;
    hasDropdown?: boolean;
}

// --- Navigation Configuration ---
const navLinks: NavLink[] = [
    { name: "หน้าแรก", href: "/" },
    { name: "เกี่ยวกับองค์กร", href: "/about" },
    { name: "หน่วยงาน", href: "/department" },
    { name: "งานบริการ", href: "/service" },
    { name: "งานประชุม", href: "/meeting" },
    { name: "ข่าวสาร", href: "/news" },
    { name: "กฎหมาย", href: "/laws" },
    { name: "ดาวน์โหลด", href: "/other-service" },
    { name: "ติดต่อ", href: "/contact" },
];

export default function Navbar() {
    // --- State & Hooks ---
    const pathname = usePathname();
    const router = useRouter();
    const { authReady } = useAuth();
    const [lang, setLang] = useState("TH");
    const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [webSettings, setWebSettings] = useState<any>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const menuLangRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const settings = await getWebSettings();
                setWebSettings(settings);
            } catch (error) {
                console.error('Error fetching web settings:', error);
            }
        };
        fetchSettings();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const inBar = dropdownRef.current?.contains(target);
            const inMenu = menuLangRef.current?.contains(target);
            if (!inBar && !inMenu) {
                setIsLangDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        setMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!menuOpen) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setMenuOpen(false);
        };
        document.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            document.removeEventListener("keydown", onKey);
        };
    }, [menuOpen]);

    return (
        <nav className={`${styles.navbar} ThaiFont`}>
            {/* 1. TOP BANNER (Green Section) - Logo, Titles, and Actions */}
            <div className={styles.topBanner}>
                <div className={styles.brandArea}>
                    <Image
                        src={webSettings?.logoPath || "/images/public/icon.jpg"}
                        alt="Pharmacy Council Logo"
                        width={40}
                        height={40}
                        className={styles.logo}
                    />
                    <div>
                        <h1 className={`${styles.brandTitle} ThaiFont`}>
                            {webSettings?.siteNameTh || "สภาเภสัชกรรม"}
                        </h1>
                        <p className={`${styles.brandSubtitle} ThaiFont`}>
                            {webSettings?.siteNameEn || "THE PHARMACY COUNCIL OF THAILAND"}
                        </p>
                    </div>
                    {pathname === "/login" && (
                        <>
                            <div className={styles.navDivider}></div>
                            <h2 className={`${styles.systemName} ThaiFont`}>
                                ระบบบริการผู้ประกอบวิชาชีพเภสัชกรรม
                            </h2>
                        </>
                    )}
                </div>

                <button
                    type="button"
                    className={styles.menuToggle}
                    aria-label={menuOpen ? "ปิดเมนู" : "เปิดเมนู"}
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((open) => !open)}
                >
                    <span />
                    <span />
                    <span />
                </button>

                <div className={styles.actionsArea}>
                    {/* 1.2 User Actions (Language & Login) */}
                    {/* Language Switcher */}
                    <div className={styles.langDropdownContainer} ref={dropdownRef}>
                        <div
                            className={styles.langSwitch}
                            onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                        >
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
                            <span className={styles.langSwitchText}>{lang}</span>
                            <svg
                                className={`${styles.langSwitchArrow} ${isLangDropdownOpen ? styles.rotate180 : ""}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>

                        {isLangDropdownOpen && (
                            <div className={`${styles.langDropdown} ThaiFont`}>
                                <button
                                    className={`${styles.langDropdownItem} ${lang === "TH" ? styles.langDropdownItemActive : ""}`}
                                    onClick={() => {
                                        setLang("TH");
                                        setIsLangDropdownOpen(false);
                                    }}
                                >
                                    <div className={styles.langSelectedText}>
                                        <span>ภาษาไทย</span>
                                        <span className={styles.langEngName}>Thai</span>
                                    </div>
                                    <span>TH</span>
                                </button>
                                <button
                                    className={`${styles.langDropdownItem} ${lang === "EN" ? styles.langDropdownItemActive : ""}`}
                                    onClick={() => {
                                        setLang("EN");
                                        setIsLangDropdownOpen(false);
                                    }}
                                >
                                    <div className={styles.langSelectedText}>
                                        <span>English</span>
                                        <span className={styles.langEngName}>อังกฤษ</span>
                                    </div>
                                    <span>EN</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Login Button - Hide on login page and while identity is unresolved */}
                    {authReady && pathname !== "/login" && (
                        <button
                            className={`${styles.loginBtn} ThaiFont`}
                            onClick={() => router.push("/login")}
                        >
                            เข้าสู่ระบบเภสัชกร
                        </button>
                    )}
                </div>
            </div>

            {/* 2. LOWER NAVIGATION (White Section) - Main Menu Links */}
            <div className={styles.lowerNav}>
                <div className={styles.navContainer}>
                    {navLinks.map((link) => {
                        const isActive = pathname === link.href || (link.href === "/" && pathname === "/home");
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`${isActive ? styles.navItemActive : styles.navItem} ThaiFont`}
                            >
                                {link.name}
                                {link.hasDropdown && (
                                    <svg
                                        className={styles.navIcon}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                )}
                                {/* Underline for Active */}
                                {isActive && (
                                    <div className={styles.activeIndicator} />
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>

            <div className={`${styles.menu} ${menuOpen ? styles.menuOpen : ""} ThaiFont`}>
                <div className={styles.menuHeader}>
                    <div className={styles.brandArea}>
                        <Image
                            src={webSettings?.logoPath || "/images/public/icon.jpg"}
                            alt="Pharmacy Council Logo"
                            width={40}
                            height={40}
                            className={styles.logo}
                        />
                        <div>
                            <h1 className={`${styles.brandTitle} ThaiFont`}>
                                {webSettings?.siteNameTh || "สภาเภสัชกรรม"}
                            </h1>
                            <p className={`${styles.brandSubtitle} ThaiFont`}>
                                {webSettings?.siteNameEn || "THE PHARMACY COUNCIL OF THAILAND"}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        className={styles.menuClose}
                        aria-label="ปิดเมนู"
                        onClick={() => setMenuOpen(false)}
                    >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                    </button>
                </div>

                {authReady && pathname !== "/login" && (
                    <button
                        type="button"
                        className={`${styles.menuLogin} ThaiFont`}
                        onClick={() => router.push("/login")}
                    >
                        เข้าสู่ระบบเภสัชกร
                    </button>
                )}

                <div className={styles.menuLinks}>
                    {navLinks.map((link) => {
                        const isActive = pathname === link.href || (link.href === "/" && pathname === "/home");
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`${styles.menuLink} ${isActive ? styles.menuLinkActive : ""} ThaiFont`}
                            >
                                {link.name}
                            </Link>
                        );
                    })}
                </div>

                <div className={`${styles.langDropdownContainer} ${styles.menuLang}`} ref={menuLangRef}>
                    <div
                        className={styles.langSwitch}
                        onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
                    >
                        <svg className={styles.langSwitchIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        <span className={styles.langSwitchText}>{lang}</span>
                        <svg className={`${styles.langSwitchArrow} ${isLangDropdownOpen ? styles.rotate180 : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                    {isLangDropdownOpen && (
                        <div className={`${styles.langDropdown} ThaiFont`}>
                            <button
                                type="button"
                                className={`${styles.langDropdownItem} ${lang === "TH" ? styles.langDropdownItemActive : ""}`}
                                onClick={() => { setLang("TH"); setIsLangDropdownOpen(false); }}
                            >
                                <div className={styles.langSelectedText}>
                                    <span>ภาษาไทย</span>
                                    <span className={styles.langEngName}>Thai</span>
                                </div>
                                <span>TH</span>
                            </button>
                            <button
                                type="button"
                                className={`${styles.langDropdownItem} ${lang === "EN" ? styles.langDropdownItemActive : ""}`}
                                onClick={() => { setLang("EN"); setIsLangDropdownOpen(false); }}
                            >
                                <div className={styles.langSelectedText}>
                                    <span>English</span>
                                    <span className={styles.langEngName}>อังกฤษ</span>
                                </div>
                                <span>EN</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}

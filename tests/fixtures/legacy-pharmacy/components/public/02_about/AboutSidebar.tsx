"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./AboutSidebar.module.css";

const SIDEBAR_LINKS = [
  { href: "/about", label: "ประวัติความเป็นมา" },
  { href: "/about/council-directory", label: "ทำเนียบสภาเภสัชกรรม" },
  { href: "/about/committee", label: "กรรมการเภสัชกรรม" },
  { href: "/about/hall-of-fame", label: "หอเกียรติประวัติ" },
  { href: "/about/members", label: "ข้อมูลสมาชิก" },
  { href: "/about/registrants", label: "จำนวนผู้ขึ้นทะเบียน" },
  // { href: "/about/policy", label: "นโยบายสภาเภสัชกรรม" },
];

export default function AboutSidebar() {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar}>
      <h2 className={`${styles.sidebarTitle} ThaiFont`}>เกี่ยวกับองค์กร</h2>
      <nav className={styles.sidebarNav}>
        {SIDEBAR_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`${styles.sidebarLink} ThaiFont ${
              pathname === link.href ? styles.sidebarLinkActive : ""
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

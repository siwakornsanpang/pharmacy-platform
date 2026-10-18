"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BIG_MODULES, filterBigModules, type BigModule } from "@/app/config/menu";
import { SkeletonBlock } from "@/app/components/ui/Skeleton";
import styles from "./Hub.module.css";
import { useStaff } from "@/features/access/StaffProvider";

export default function ModuleHubPage() {
  const staff = useStaff();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onSearch = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string") setQuery(detail);
    };
    window.addEventListener("bo-hub-search", onSearch as EventListener);
    return () => window.removeEventListener("bo-hub-search", onSearch as EventListener);
  }, []);

  const modules = useMemo(() => {
    const visible = filterBigModules(BIG_MODULES, staff.permissions);
    const q = query.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter((m) => m.title.toLowerCase().includes(q));
  }, [staff.permissions, query]);

  return (
    <div className={styles.hub}>
      <div className={styles.decorBottom} aria-hidden />
      <div className={styles.grid}>
        {modules.map((mod: BigModule) => (
          <Link key={mod.id} href={mod.href} className={styles.card}>
            <div className={styles.iconCircle}>{mod.icon}</div>
            <span className={styles.cardTitle}>{mod.title}</span>
            <span className={styles.cardLine} />
          </Link>
        ))}
      </div>
      {modules.length === 0 && (
        <p className={styles.empty}>ไม่พบโมดูลที่ตรงกับการค้นหา หรือยังไม่มีสิทธิ์เข้าถึง</p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { BIG_MODULES, type BigModule } from "@/app/config/menu";
import { authFetch } from "@/app/utils/authFetch";
import { SkeletonBlock } from "@/app/components/ui/Skeleton";
import styles from "./Hub.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ModuleHubPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const token = Cookies.get("auth_token");
    if (!token) {
      router.replace("/login");
      return;
    }
    setReady(true);

    const load = async () => {
      try {
        const role = Cookies.get("user_role") || "";
        if (role === "admin") {
          setPermissions(BIG_MODULES.map((m) => m.permission).filter(Boolean) as string[]);
          return;
        }
        const res = await authFetch(`${API_URL}/permissions/my`);
        if (res.ok) {
          const data = await res.json();
          setPermissions(Array.isArray(data) ? data : []);
        }
      } catch {
        /* ignore */
      } finally {
        setLoadingPerms(false);
      }
    };

    load().finally(() => setLoadingPerms(false));
  }, [router]);

  useEffect(() => {
    const onSearch = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (typeof detail === "string") setQuery(detail);
    };
    window.addEventListener("bo-hub-search", onSearch as EventListener);
    return () => window.removeEventListener("bo-hub-search", onSearch as EventListener);
  }, []);

  const modules = useMemo(() => {
    const role = Cookies.get("user_role") || "";
    const visible =
      role === "admin"
        ? BIG_MODULES
        : BIG_MODULES.filter((m) => !m.permission || permissions.includes(m.permission));

    const q = query.trim().toLowerCase();
    if (!q) return visible;
    return visible.filter((m) => m.title.toLowerCase().includes(q));
  }, [permissions, query]);

  if (!ready) return null;

  return (
    <div className={styles.hub}>
      <div className={styles.decorBottom} aria-hidden />
      <div className={styles.grid}>
        {loadingPerms
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.cardSkeleton}>
                <SkeletonBlock width="72px" height="72px" radius="999px" />
                <SkeletonBlock width="70%" height="1rem" />
              </div>
            ))
          : modules.map((mod: BigModule) => (
              <Link key={mod.id} href={mod.href} className={styles.card}>
                <div className={styles.iconCircle}>{mod.icon}</div>
                <span className={styles.cardTitle}>{mod.title}</span>
                <span className={styles.cardLine} />
              </Link>
            ))}
      </div>
      {!loadingPerms && modules.length === 0 && (
        <p className={styles.empty}>ไม่พบโมดูลที่ตรงกับการค้นหา หรือยังไม่มีสิทธิ์เข้าถึง</p>
      )}
    </div>
  );
}

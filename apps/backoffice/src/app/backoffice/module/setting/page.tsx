"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** เมนูย่อยอยู่ที่ sidebar แล้ว */
export default function SettingMenuPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/backoffice/module/setting/users");
  }, [router]);
  return null;
}

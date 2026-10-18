"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** เมนูย่อยย้ายไป sidebar แล้ว — redirect ไปหน้าแรกของกลุ่ม */
export default function ServiceMenuPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/backoffice/module/council-web/service/medicine");
  }, [router]);
  return null;
}

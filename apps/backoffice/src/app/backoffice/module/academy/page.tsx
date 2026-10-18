"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AcademyPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/backoffice/module/academy/categories");
  }, [router]);
  return null;
}

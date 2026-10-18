"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PharmacistWebMenuPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/backoffice/module/pharmacist-web/home");
  }, [router]);
  return null;
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CouncilWebMenu() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/backoffice/module/council-web/home");
  }, [router]);
  return null;
}

"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Scroll to top when the route changes (nav tab / page switch). */
export default function ScrollToTopOnNavigate() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

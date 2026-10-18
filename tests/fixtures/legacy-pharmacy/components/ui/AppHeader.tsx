"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Navbar from "./Navbar";
import MemberNavbar from "./MemberNavbar";

export default function AppHeader() {
  const pathname = usePathname();
  const { isLoggedIn } = useAuth();

  // Hide navbar on login page
  if (pathname === "/login") {
    return null;
  }

  return (
    <header className="sticky top-0 z-[1100]">
      {isLoggedIn ? <MemberNavbar /> : <Navbar />}
    </header>
  );
}

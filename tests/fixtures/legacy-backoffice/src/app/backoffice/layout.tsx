"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Cookies from "js-cookie";

import Header from "./layout/Header";
import Sidebar from "./layout/Sidebar";
import { SkeletonPage } from "@/app/components/ui/Skeleton";
import { isBackofficeHub } from "@/app/config/menu";

export default function BackOfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isHub = isBackofficeHub(pathname);

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userRole, setUserRole] = useState("viewer");
  const [userName, setUserName] = useState("User");

  useEffect(() => {
    queueMicrotask(() => setIsMounted(true));
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    queueMicrotask(() => {
      const token = Cookies.get("auth_token");
      if (!token) {
        setIsAuthorized(false);
        router.replace("/login");
      } else {
        setIsAuthorized(true);
        setUserRole(Cookies.get("user_role") || "viewer");
        setUserName(Cookies.get("user_display_name") || "User");
      }
    });
  }, [isMounted, router]);

  // เมื่อเข้า hub ให้ปิด sidebar; เข้า module ให้เปิด
  useEffect(() => {
    setIsSidebarOpen(!isHub);
  }, [isHub]);

  if (!isMounted) return null;
  if (isAuthorized === null) return <SkeletonPage />;
  if (isAuthorized === false) return null;

  return (
    <div
      className="min-h-screen font-sans"
      style={{
        background:
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(115,115,0,0.16), transparent 55%), linear-gradient(180deg, #f3f1dc 0%, #f7f4ea 180px, #f7f4ea 100%)",
      }}
    >
      <Header
        variant={isHub ? "hub" : "module"}
        onToggle={() => setIsSidebarOpen((prev) => !prev)}
        userName={userName}
        userRole={userRole}
      />

      {!isHub && (
        <Sidebar isOpen={isSidebarOpen} userRole={userRole} userName={userName} />
      )}

      <main
        className={`
          pt-[72px]
          transition-all duration-300 ease-in-out
          ${!isHub && isSidebarOpen ? "pl-[240px]" : "pl-0"}
        `}
      >
        <div className={isHub ? "p-0" : "p-6"}>{children}</div>
      </main>
    </div>
  );
}

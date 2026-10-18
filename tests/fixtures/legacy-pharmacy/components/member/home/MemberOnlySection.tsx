"use client";

import { useAuth } from "@/context/AuthContext";

export default function MemberOnlySection({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) return null;

  return <>{children}</>;
}

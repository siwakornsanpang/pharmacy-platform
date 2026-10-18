"use client";

import { AuthProvider } from "@/context/AuthContext";
import ScrollToTopOnNavigate from "@/components/ui/ScrollToTopOnNavigate";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ScrollToTopOnNavigate />
      {children}
    </AuthProvider>
  );
}

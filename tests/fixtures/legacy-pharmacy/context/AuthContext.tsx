"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { shouldReloadForStaleSession } from "@/lib/conference/session-recovery";

interface AuthContextType {
  isLoggedIn: boolean;
  userName: string;
  userId: string;
  refresh: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  userName: "",
  userId: "",
  refresh: async () => false,
  logout: async () => {},
});

interface PharmacyUser { displayName: string; pharmacistLicense: string }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PharmacyUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const recoveryStarted = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/pharmacy/me", { credentials: "include", cache: "no-store" });
      if (!response.ok) {
        let problem: unknown = null;
        try { problem = await response.json(); } catch { /* response has no problem body */ }
        setUser(null);
        if (!recoveryStarted.current && shouldReloadForStaleSession(problem)) {
          recoveryStarted.current = true;
          window.location.reload();
        }
        return false;
      }
      const payload = await response.json() as { user: PharmacyUser };
      setUser(payload.user);
      return true;
    } catch {
      setUser(null);
      return false;
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh().finally(() => setLoaded(true)); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/pharmacy/logout", { method: "POST", credentials: "include" }).catch(() => undefined);
    setUser(null);
    window.location.href = "/home";
  }, []);

  if (!loaded) return null;
  return <AuthContext.Provider value={{ isLoggedIn: Boolean(user), userName: user?.displayName ?? "", userId: user?.pharmacistLicense ?? "", refresh, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

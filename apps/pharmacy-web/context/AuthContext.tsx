"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { shouldReloadForStaleSession } from "@/lib/conference/session-recovery";

interface AuthContextType {
  isLoggedIn: boolean;
  userName: string;
  userId: string;
  authReady: boolean;
  refresh: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  userName: "",
  userId: "",
  authReady: false,
  refresh: async () => false,
  logout: async () => {},
});

interface PharmacyUser { displayName: string; pharmacistLicense: string }

const AUTH_TIMEOUT_MS = 10_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PharmacyUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const recoveryStarted = useRef(false);

  const refresh = useCallback(async () => {
    const controller = new AbortController();
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      controller.abort();
      setUser(null);
      setAuthReady(true);
    }, AUTH_TIMEOUT_MS);
    try {
      const response = await fetch("/api/auth/pharmacy/me", {
        credentials: "include",
        cache: "no-store",
        signal: controller.signal,
      });
      if (settled) return false;
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
      if (!settled) setUser(null);
      return false;
    } finally {
      window.clearTimeout(timer);
      settled = true;
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/pharmacy/logout", { method: "POST", credentials: "include" }).catch(() => undefined);
    setUser(null);
    window.location.href = "/home";
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn: Boolean(user), userName: user?.displayName ?? "", userId: user?.pharmacistLicense ?? "", authReady, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

import type { NextRequest } from "next/server";
import type { VerifiedPharmacyIdentity } from "./adapter";
import { mockPharmacyAdapter } from "./mock-adapter";
import { getSession } from "./session-store";

export const PHARMACY_SESSION_COOKIE = "pharmacy_session";

export function pharmacyAuthConfig() {
  const mode = process.env.PHARMACY_AUTH_MODE ?? "mock";
  const store = process.env.PHARMACY_SESSION_STORE ?? "memory";
  const ttl = Number(process.env.PHARMACY_SESSION_TTL_SECONDS ?? 7 * 24 * 60 * 60);
  const pocMode = process.env.PHARMACY_POC_MODE === "true";
  if (process.env.NODE_ENV === "production" && !pocMode && (mode === "mock" || store === "memory")) {
    throw new Error("Production requires a real Pharmacy auth adapter and durable session store");
  }
  if (mode !== "mock" || store !== "memory" || !Number.isInteger(ttl) || ttl < 300 || ttl > 30 * 24 * 60 * 60) {
    throw new Error("Unsupported Pharmacy authentication configuration");
  }
  return { adapter: mockPharmacyAdapter, ttlSeconds: ttl };
}

export type PharmacySessionState =
  | { status: "absent"; sessionId: null; identity: null }
  | { status: "stale"; sessionId: string; identity: null }
  | { status: "valid"; sessionId: string; identity: VerifiedPharmacyIdentity };

export function readPharmacySession(request: NextRequest): PharmacySessionState {
  pharmacyAuthConfig();
  const sessionId = request.cookies.get(PHARMACY_SESSION_COOKIE)?.value;
  if (!sessionId) return { status: "absent", sessionId: null, identity: null };
  const identity = getSession(sessionId);
  return identity
    ? { status: "valid", sessionId, identity }
    : { status: "stale", sessionId, identity: null };
}

export const pharmacyCookieOptions = (ttlSeconds: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ttlSeconds,
});

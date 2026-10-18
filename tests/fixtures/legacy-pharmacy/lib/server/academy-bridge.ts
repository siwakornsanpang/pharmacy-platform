import { NextRequest, NextResponse } from "next/server";
import { readPharmacySession } from "./pharmacy-auth/session";

export function memberIdentity(request: NextRequest) {
  const session = readPharmacySession(request);
  return session.status === "valid" ? session.identity : null;
}

export async function academyMember(path: string, init?: RequestInit) {
  const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-academy-bridge": process.env.ACADEMY_BRIDGE_KEY || "",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}

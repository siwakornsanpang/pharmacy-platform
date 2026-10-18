import { NextRequest, NextResponse } from "next/server";
import { PHARMACY_SESSION_COOKIE, readPharmacySession } from "@/lib/server/pharmacy-auth/session";

export async function GET(request: NextRequest) {
  const session = readPharmacySession(request);
  if (session.status === "absent") return NextResponse.json({ code: "PHARMACY_SESSION_REQUIRED", title: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  if (session.status === "stale") {
    const response = NextResponse.json({ code: "PHARMACY_SESSION_INVALID", title: "Session หมดอายุ กรุณาเข้าสู่ระบบใหม่", meta: { sessionCleared: true } }, { status: 401 });
    response.cookies.delete(PHARMACY_SESSION_COOKIE);
    return response;
  }
  const identity = session.identity;
  return NextResponse.json({ user: { displayName: `ภก. ${identity.firstName} ${identity.lastName}`, pharmacistLicense: identity.pharmacistLicense } });
}

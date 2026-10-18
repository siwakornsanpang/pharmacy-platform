import { NextRequest, NextResponse } from "next/server";
import { createChallenge, createSession, consumeChallenge } from "@/lib/server/pharmacy-auth/session-store";
import { PHARMACY_SESSION_COOKIE, pharmacyAuthConfig, pharmacyCookieOptions } from "@/lib/server/pharmacy-auth/session";

export async function POST(request: NextRequest) {
  try {
    const config = pharmacyAuthConfig();
    const body = await request.json() as Record<string, unknown>;
    if (typeof body.challengeId === "string" && typeof body.otp === "string") {
      const identity = consumeChallenge(body.challengeId);
      if (!identity || !(await config.adapter.verifyOtp(identity, body.otp))) {
        return NextResponse.json({ code: "PHARMACY_OTP_INVALID", title: "รหัส OTP ไม่ถูกต้อง" }, { status: 401 });
      }
      const response = NextResponse.json({ user: present(identity) });
      response.cookies.set(PHARMACY_SESSION_COOKIE, createSession(identity, config.ttlSeconds), pharmacyCookieOptions(config.ttlSeconds));
      return response;
    }
    if (typeof body.license !== "string" || typeof body.password !== "string") {
      return NextResponse.json({ code: "VALIDATION_ERROR", title: "ข้อมูลเข้าสู่ระบบไม่ครบถ้วน" }, { status: 400 });
    }
    const identity = await config.adapter.authenticate(body.license, body.password);
    if (!identity) return NextResponse.json({ code: "PHARMACY_CREDENTIALS_INVALID", title: "เลขที่ใบอนุญาตหรือรหัสผ่านไม่ถูกต้อง" }, { status: 401 });
    return NextResponse.json({ requiresOtp: true, challengeId: createChallenge(identity), maskedPhone: "XXX-XXX-0440", reference: "A0990" });
  } catch {
    return NextResponse.json({ code: "PHARMACY_AUTH_UNAVAILABLE", title: "ระบบยืนยันตัวตนยังไม่พร้อมใช้งาน" }, { status: 503 });
  }
}

function present(identity: { firstName: string; lastName: string; pharmacistLicense: string }) {
  return { displayName: `ภก. ${identity.firstName} ${identity.lastName}`, pharmacistLicense: identity.pharmacistLicense };
}

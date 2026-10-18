import { NextRequest, NextResponse } from "next/server";
import { getServerConfig } from "@/lib/config/server";
import { signConferenceAssertion } from "@/lib/server/conference-assertion";
import { PHARMACY_SESSION_COOKIE, readPharmacySession } from "@/lib/server/pharmacy-auth/session";

const conferenceCookie = (value: string | null) => (value ?? "").split(";").map((item) => item.trim()).filter((item) => /^(conference_attendee_session|conference_csrf)=/.test(item)).join("; ");
const noStore = { "Cache-Control": "no-store" };

function cookieHeaders(response: Response) {
  return typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : response.headers.get("set-cookie") ? [response.headers.get("set-cookie")!] : [];
}

export async function POST(request: NextRequest) {
  const session = readPharmacySession(request);
  if (session.status === "absent") return NextResponse.json({ status: 401, code: "PHARMACY_SESSION_REQUIRED", title: "กรุณาเข้าสู่ระบบ Pharmacy ใหม่" }, { status: 401, headers: noStore });
  if (session.status === "stale") {
    const response = NextResponse.json({ status: 401, code: "PHARMACY_SESSION_INVALID", title: "Session Pharmacy หมดอายุ", meta: { sessionCleared: true } }, { status: 401, headers: noStore });
    response.cookies.delete(PHARMACY_SESSION_COOKIE);
    return response;
  }
  const identity = session.identity;
  try {
    const base = getServerConfig().conferenceApiUrl;
    const existing = await fetch(`${base}/api/v1/me`, {
      headers: { cookie: conferenceCookie(request.headers.get("cookie")), accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (existing.ok) {
      try {
        const profile = await existing.json() as { pharmacistLicense?: string | null };
        if (profile.pharmacistLicense === identity.pharmacistLicense) return NextResponse.json({ established: true, exchanged: false }, { headers: noStore });
      } catch { /* exchange when the existing profile cannot be read */ }
    }

    const exchange = await fetch(`${base}/api/v1/auth/pharmacy/exchange`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ assertion: await signConferenceAssertion(identity) }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const body = await exchange.arrayBuffer();
    const response = new NextResponse(body, { status: exchange.status, headers: { "content-type": exchange.headers.get("content-type") ?? "application/json", ...noStore } });
    for (const cookie of cookieHeaders(exchange)) response.headers.append("set-cookie", cookie);
    return response;
  } catch {
    return NextResponse.json({ status: 503, code: "CONFERENCE_IDENTITY_UNAVAILABLE", title: "ไม่สามารถเชื่อมสิทธิ์งานประชุมได้ในขณะนี้" }, { status: 503, headers: noStore });
  }
}

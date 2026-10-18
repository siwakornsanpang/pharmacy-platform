import { NextRequest, NextResponse } from "next/server";
import { academyMember, memberIdentity } from "@/lib/server/academy-bridge";

export async function GET(request: NextRequest) {
  const identity = memberIdentity(request);
  if (!identity) return NextResponse.json({ message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const license = encodeURIComponent(identity.pharmacistLicense);
  return academyMember(`/academy/member/enrollments?license=${license}`);
}

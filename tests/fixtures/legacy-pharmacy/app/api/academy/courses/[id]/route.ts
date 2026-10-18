import { NextRequest, NextResponse } from "next/server";
import { academyMember, memberIdentity } from "@/lib/server/academy-bridge";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const identity = memberIdentity(request);
  if (!identity) return NextResponse.json({ message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const { id } = await context.params;
  const license = encodeURIComponent(identity.pharmacistLicense);
  return academyMember(`/academy/member/courses/${id}/learning?license=${license}`);
}

import { NextRequest, NextResponse } from "next/server";
import { academyMember, memberIdentity } from "@/lib/server/academy-bridge";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const identity = memberIdentity(request);
  if (!identity) return NextResponse.json({ message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const { id } = await context.params;
  return academyMember("/academy/member/enroll", {
    method: "POST",
    body: JSON.stringify({
      courseId: Number(id),
      pharmacistLicense: identity.pharmacistLicense,
      displayName: `${identity.firstName} ${identity.lastName}`.trim(),
    }),
  });
}

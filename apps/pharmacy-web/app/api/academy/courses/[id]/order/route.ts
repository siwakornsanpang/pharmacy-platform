import { NextRequest, NextResponse } from "next/server";
import { forwardAcademyMember, getAcademyMemberActor } from "@/lib/server/academy-bridge";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const actor = getAcademyMemberActor(request);
  if (!actor) return NextResponse.json({ message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const { id } = await context.params;
  const key = request.headers.get("idempotency-key");
  return forwardAcademyMember(request, { method: "POST", path: "/academy/member/orders" }, {
    headers: key ? { "Idempotency-Key": key } : undefined,
    body: JSON.stringify({
      courseId: Number(id),
      pharmacistLicense: actor.pharmacistLicense,
      displayName: actor.displayName,
      subject: actor.subject,
    }),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { forwardAcademyMember, getAcademyMemberActor } from "@/lib/server/academy-bridge";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const actor = getAcademyMemberActor(request);
  if (!actor) return NextResponse.json({ message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  return forwardAcademyMember(request, { method: "POST", path: `/academy/member/courses/${id}/exam` }, {
    body: JSON.stringify({
      pharmacistLicense: actor.pharmacistLicense,
      displayName: actor.displayName,
      subject: actor.subject,
      answers: Array.isArray(body.answers) ? body.answers : [],
    }),
  });
}

import { NextRequest, NextResponse } from "next/server";
import { forwardAcademyMember, getAcademyMemberActor } from "@/lib/server/academy-bridge";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const actor = getAcademyMemberActor(request);
  if (!actor) return NextResponse.json({ message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const { id } = await context.params;
  return forwardAcademyMember(request, { method: "GET", path: `/academy/member/courses/${id}/learning` }, {});
}

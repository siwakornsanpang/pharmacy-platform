import { NextRequest, NextResponse } from "next/server";
import { memberIdentity } from "@/lib/server/academy-bridge";

export async function POST(request: NextRequest) {
  const identity = memberIdentity(request);
  if (!identity) return NextResponse.json({ message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  const incoming = await request.formData();
  const file = incoming.get("file");
  if (!(file instanceof File)) return NextResponse.json({ message: "ไม่พบไฟล์" }, { status: 400 });
  const body = new FormData();
  body.append("file", file);
  const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");
  const response = await fetch(`${base}/academy/member/upload`, {
    method: "POST",
    headers: { "x-academy-bridge": process.env.ACADEMY_BRIDGE_KEY || "" },
    body,
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}

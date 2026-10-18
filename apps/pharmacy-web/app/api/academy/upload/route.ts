import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@/lib/api/types";
import { requestMetadata } from "@/lib/api/server";
import { createAcademyUploadIntent } from "@/lib/server/academy-bridge";

export async function POST(request: NextRequest) {
  try {
    const text = await requestMetadata(request);
    if (text === undefined) return NextResponse.json({ message: "ข้อมูลไม่ครบ" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    return createAcademyUploadIntent(request, JSON.parse(text) as unknown);
  } catch (error) {
    const status = error instanceof ApiError && error.status >= 400 && error.status < 500 ? error.status : 503;
    return NextResponse.json(
      { message: error instanceof ApiError ? error.kind : "Academy temporarily unavailable" },
      { status, headers: { "Cache-Control": "no-store" } },
    );
  }
}

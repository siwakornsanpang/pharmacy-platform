import { NextResponse } from "next/server";
import { PHARMACY_SESSION_COOKIE } from "@/lib/server/pharmacy-auth/session";

export async function POST() {
  const response = new NextResponse(null, { status: 204 });
  response.cookies.delete(PHARMACY_SESSION_COOKIE);
  return response;
}

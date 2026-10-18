import { NextRequest } from "next/server";
import { redirectAcademyMemberDownload } from "@/lib/server/academy-bridge";

export async function GET(request: NextRequest, context: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await context.params;
  return redirectAcademyMemberDownload(request, assetId);
}

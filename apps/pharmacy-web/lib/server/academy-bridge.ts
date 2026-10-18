import { NextRequest, NextResponse } from "next/server";
import type { AcademyMemberActor, AcademyUploadIntentMetadata } from "@pharmacy/contracts/academy";
import { getServerConfig } from "../config/server";
import { readPharmacySession } from "./pharmacy-auth/session";

export type AcademyMemberRoute =
  | { method: "GET"; path: "/academy/member/enrollments" }
  | { method: "GET"; path: `/academy/member/courses/${string}/learning` }
  | { method: "GET"; path: `/academy/member/courses/${string}/certificate` }
  | { method: "GET"; path: `/academy/member/assets/${string}/download` }
  | { method: "POST"; path: "/academy/member/enroll" }
  | { method: "POST"; path: "/academy/member/orders" }
  | { method: "POST"; path: "/academy/member/upload" }
  | { method: "POST"; path: `/academy/member/lessons/${string}/complete` }
  | { method: "POST"; path: `/academy/member/courses/${string}/cancel` }
  | { method: "POST"; path: `/academy/member/courses/${string}/exam` }
  | { method: "POST"; path: `/academy/member/courses/${string}/refund` };

const assetIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const metadataKeys = ["filename", "declaredMime", "size"] as const;
const overrideKeys = [
  "owner", "actor", "kind", "pharmacistLicense", "subject", "displayName",
  "uploadUrl", "ticket", "destination", "actorKey",
];

export function getAcademyMemberActor(request: NextRequest): AcademyMemberActor | null {
  const session = readPharmacySession(request);
  if (session.status !== "valid" || !session.identity) return null;
  const identity = session.identity;
  return {
    kind: "pharmacy-mock",
    subject: identity.subject,
    pharmacistLicense: identity.pharmacistLicense,
    displayName: `ภก. ${identity.firstName} ${identity.lastName}`.trim(),
  };
}

export function memberIdentity(request: NextRequest) {
  const session = readPharmacySession(request);
  return session.status === "valid" ? session.identity : null;
}

function sameOrigin(request: NextRequest) {
  return request.headers.get("origin") === getServerConfig().appOrigin;
}

function deny(status: number, message: string) {
  return NextResponse.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
}

export function parseAcademyUploadMetadata(value: unknown): AcademyUploadIntentMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid");
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.some((key) => overrideKeys.includes(key) || !metadataKeys.includes(key as typeof metadataKeys[number])))
    throw new Error("invalid");
  const filename = record.filename;
  const declaredMime = record.declaredMime;
  const size = record.size;
  if (typeof filename !== "string" || filename.length < 1 || filename.length > 255) throw new Error("invalid");
  if (typeof declaredMime !== "string" || declaredMime.length < 1 || declaredMime.length > 127) throw new Error("invalid");
  if (typeof size !== "number" || !Number.isSafeInteger(size) || size < 1 || size > 104_857_600) throw new Error("invalid");
  return { filename, declaredMime, size };
}

export async function forwardAcademyMember(
  request: NextRequest,
  route: AcademyMemberRoute,
  init: RequestInit,
): Promise<Response> {
  const actor = getAcademyMemberActor(request);
  if (!actor) return deny(401, "กรุณาเข้าสู่ระบบ");
  if (route.method !== "GET" && !sameOrigin(request))
    return deny(403, "ไม่มีสิทธิ์เรียกเส้นนี้");
  const config = getServerConfig();
  const target = new URL(route.path, `${config.backendApiUrl}/`);
  if (route.method === "GET") target.searchParams.set("license", actor.pharmacistLicense);
  const response = await fetch(target, {
    ...init,
    method: route.method,
    headers: {
      "Content-Type": "application/json",
      "x-academy-bridge": config.academyBridgeKey,
      ...(init.headers || {}),
    },
    cache: "no-store",
    redirect: "manual",
  });
  if (response.status === 302) {
    const location = response.headers.get("location") ?? "";
    if (!/^https:\/\/[^\s]+$/.test(location)) return deny(503, "Academy temporarily unavailable");
    return new NextResponse(null, { status: 302, headers: { Location: location, "Cache-Control": "no-store" } });
  }
  const data = await response.json().catch(() => ({}));
  const forwarded = NextResponse.json(data, { status: response.status });
  forwarded.headers.set("Cache-Control", "no-store");
  return forwarded;
}

export async function createAcademyUploadIntent(request: NextRequest, metadata: unknown): Promise<Response> {
  const actor = getAcademyMemberActor(request);
  if (!actor) return deny(401, "กรุณาเข้าสู่ระบบ");
  let parsed: AcademyUploadIntentMetadata;
  try { parsed = parseAcademyUploadMetadata(metadata); }
  catch { return deny(400, "ข้อมูลไม่ครบ"); }
  return forwardAcademyMember(request, { method: "POST", path: "/academy/member/upload" }, {
    body: JSON.stringify({
      filename: parsed.filename,
      declaredMime: parsed.declaredMime,
      size: parsed.size,
      pharmacistLicense: actor.pharmacistLicense,
      displayName: actor.displayName,
      subject: actor.subject,
    }),
  });
}

export async function redirectAcademyMemberDownload(request: NextRequest, assetId: string): Promise<Response> {
  if (!assetIdPattern.test(assetId)) return deny(400, "ไม่พบไฟล์");
  return forwardAcademyMember(request, { method: "GET", path: `/academy/member/assets/${assetId}/download` }, {});
}

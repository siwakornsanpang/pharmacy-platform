import type { NextRequest } from "next/server";
import { getServerConfig } from "@/lib/config/server";

const allowed = /^(public\/|me(?:\/|$)|auth\/(?:attendees\/logout|pharmacy\/exchange)$|orders(?:\/|$))/;
const conferenceCookie = (value: string | null) => (value ?? "")
  .split(";")
  .map((item) => item.trim())
  .filter((item) => /^(conference_attendee_session|conference_csrf)=/.test(item))
  .join("; ");

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const joined = path.map((segment) => decodeURIComponent(segment)).join("/");
  if (
    request.headers.has("authorization") ||
    request.headers.has("proxy-authorization") ||
    /pharmacy_staff|__Host-pharmacy_staff/i.test(request.headers.get("cookie") ?? "")
  ) {
    return Response.json({ status: 400, code: "INVALID_REQUEST", title: "Resource not found" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  if (!allowed.test(joined) || joined.includes("..") || joined.includes("\\") || /https?:|\/\//i.test(joined)) {
    return Response.json({ status: 404, code: "RESOURCE_NOT_FOUND", title: "Resource not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  const target = new URL(`${getServerConfig().conferenceApiUrl}/api/v1/${joined}`);
  target.search = request.nextUrl.search;
  const headers = new Headers();
  for (const name of ["accept", "content-type", "cookie", "x-csrf-token", "idempotency-key", "x-request-id"]) {
    const value = name === "cookie" ? conferenceCookie(request.headers.get(name)) : request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();
    const response = await fetch(target, {
      method: request.method, headers, body, redirect: "manual", cache: "no-store", signal: controller.signal,
    });
    const responseHeaders = new Headers({ "Cache-Control": "no-store" });
    for (const name of ["content-type", "content-length", "content-disposition", "etag", "x-request-id"]) {
      const value = response.headers.get(name); if (value) responseHeaders.set(name, value);
    }
    const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
    for (const cookie of cookies) responseHeaders.append("set-cookie", cookie);
    return new Response(response.body, { status: response.status, headers: responseHeaders });
  } catch {
    return Response.json({ status: 503, code: "CONFERENCE_UNAVAILABLE", title: "Conference temporarily unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  } finally {
    clearTimeout(timer);
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;

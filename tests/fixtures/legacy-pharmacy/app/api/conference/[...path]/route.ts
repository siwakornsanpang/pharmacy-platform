import type { NextRequest } from "next/server";

const API_URL = (process.env.CONFERENCE_API_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const allowed = /^(public\/|me(?:\/|$)|auth\/(?:attendees\/logout|pharmacy\/exchange)$|orders(?:\/|$))/;
const conferenceCookie = (value: string | null) => (value ?? "").split(";").map((item) => item.trim()).filter((item) => /^(conference_attendee_session|conference_csrf)=/.test(item)).join("; ");

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const joined = path.join("/");
  if (!allowed.test(joined) || joined.includes("..")) return Response.json({ status: 404, code: "RESOURCE_NOT_FOUND", title: "Resource not found" }, { status: 404 });
  const target = new URL(`${API_URL}/api/v1/${joined}`);
  target.search = request.nextUrl.search;
  const headers = new Headers();
  for (const name of ["accept", "content-type", "cookie", "x-csrf-token", "idempotency-key", "x-request-id"]) {
    const value = name === "cookie" ? conferenceCookie(request.headers.get(name)) : request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const body = ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer();
  const response = await fetch(target, { method: request.method, headers, body, redirect: "manual", cache: "no-store" });
  const responseHeaders = new Headers();
  for (const name of ["content-type", "content-length", "content-disposition", "cache-control", "etag", "x-request-id"]) {
    const value = response.headers.get(name); if (value) responseHeaders.set(name, value);
  }
  const cookies = typeof response.headers.getSetCookie === "function" ? response.headers.getSetCookie() : [];
  for (const cookie of cookies) responseHeaders.append("set-cookie", cookie);
  return new Response(response.body, { status: response.status, headers: responseHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;

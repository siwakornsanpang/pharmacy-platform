// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("server-only", () => ({}));
import { POST as upload } from "../../app/api/academy/upload/route";
import { GET as download } from "../../app/api/academy/assets/[assetId]/download/route";
import { GET as backendGet, POST as backendPost } from "../../app/api/backend/[...path]/route";
import { createSession } from "../../lib/server/pharmacy-auth/session-store";
import { parseAcademyUploadMetadata } from "../../lib/server/academy-bridge";
import { backendFetch } from "../../lib/api/server";

const origin = "https://app.example.test";
const identity = {
  provider: "pharmacy-council" as const,
  subject: "mock-user-11111",
  pharmacistLicense: "11111",
  firstName: "กิตติศักดิ์",
  lastName: "วัฒนานนท์",
  email: "kittisak@example.test",
  phone: "0800000441",
};
const intent = {
  id: "11111111-1111-4111-8111-111111111111",
  uploadUrl: "https://upload.example.test/api/media/uploads/11111111-1111-4111-8111-111111111111",
  ticket: "a".repeat(64),
  expiresAt: "2026-10-15T12:05:00.000Z",
};
const assetId = "22222222-2222-4222-8222-222222222222";
const staffJwtMarker = "eyJhbGciOi";

function sessionRequest(path: string, init: ConstructorParameters<typeof NextRequest>[1] = {}, sessionId?: string) {
  const cookie = sessionId ? `pharmacy_session=${sessionId}` : "";
  return new NextRequest(origin + path, {
    ...init,
    headers: { ...(init.headers as Record<string, string> | undefined), ...(cookie ? { cookie } : {}) },
  });
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("PHARMACY_POC_MODE", "true");
  vi.stubEnv("BACKEND_API_URL", "https://backend.example.test");
  vi.stubEnv("PHARMACY_WEB_ORIGIN", origin);
  vi.stubEnv("PHARMACY_SESSION_SECRET", "fake-pharmacy-session-secret-at-least-32-ch");
  vi.stubEnv("ACADEMY_BRIDGE_KEY", "fake-academy-secret");
  vi.stubEnv("CONFERENCE_API_URL", "https://conference.example.test");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("sends only JSON metadata through Next then uploads 8MiB with credentials omitted", async () => {
  const sessionId = createSession(identity, 300);
  const file = new Uint8Array(8_388_608).fill(1);
  let nextFileBytes = 0;
  let renderReceivedBytes = 0;
  const upstream = vi.fn<typeof fetch>(async (input, init) => {
    const url = String(input);
    const body = init?.body;
    if (url === "https://backend.example.test/academy/member/upload") {
      expect(typeof body).toBe("string");
      expect(new TextEncoder().encode(String(body)).byteLength).toBeLessThan(1024);
      return Response.json(intent);
    }
    if (url === intent.uploadUrl) {
      renderReceivedBytes = body instanceof Uint8Array ? body.byteLength : 0;
      return Response.json({
        id: assetId,
        owner: { domain: "academy", type: "order", id: "draft:mock-user-11111", slot: "slip" },
        kind: "academy-slip",
        visibility: "private",
      });
    }
    throw new Error(url);
  });
  vi.stubGlobal("fetch", upstream);

  expect(() => parseAcademyUploadMetadata({
    filename: "slip.jpg", declaredMime: "image/jpeg", size: file.byteLength, owner: { domain: "academy" },
  })).toThrow();

  const denied = await upload(sessionRequest("/api/academy/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filename: "slip.jpg", declaredMime: "image/jpeg", size: file.byteLength }),
  }, sessionId));
  expect(denied.status).toBe(403);
  expect(upstream).not.toHaveBeenCalled();

  const fileBody = await upload(sessionRequest("/api/academy/upload", {
    method: "POST",
    headers: { origin, "content-type": "application/octet-stream" },
    body: "not-json",
  }, sessionId));
  expect(fileBody.status).toBe(415);

  const created = await upload(sessionRequest("/api/academy/upload", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ filename: "slip.jpg", declaredMime: "image/jpeg", size: file.byteLength }),
  }, sessionId));
  expect(created.status).toBe(200);
  expect(await created.json()).toEqual(intent);
  expect(nextFileBytes).toBe(0);
  expect(nextFileBytes).toBeLessThan(file.byteLength);
  const forwarded = JSON.parse(String(upstream.mock.calls[0]?.[1]?.body));
  expect(forwarded).toMatchObject({
    filename: "slip.jpg", declaredMime: "image/jpeg", size: 8_388_608, pharmacistLicense: "11111",
  });
  expect(forwarded.owner).toBeUndefined();
  expect(forwarded.pharmacistLicense).not.toBe("22222");
  const nextHeaders = new Headers(upstream.mock.calls[0]?.[1]?.headers as HeadersInit);
  expect(nextHeaders.get("x-academy-bridge")).toBe("fake-academy-secret");
  expect(nextHeaders.get("authorization")).toBeNull();

  const browserHeaders = new Headers({
    "content-type": "application/octet-stream",
    "x-upload-ticket": intent.ticket,
  });
  expect((browserHeaders.get("authorization") ?? "").includes(staffJwtMarker)).toBe(false);
  expect(browserHeaders.has("x-academy-bridge")).toBe(false);
  const uploaded = await fetch(intent.uploadUrl, {
    method: "POST",
    body: file,
    headers: browserHeaders,
    credentials: "omit",
    cache: "no-store",
    redirect: "manual",
  });
  expect(uploaded.ok).toBe(true);
  expect(renderReceivedBytes).toBe(8_388_608);
  expect(nextFileBytes).toBe(0);
  expect(upstream.mock.calls[1]?.[1]).toMatchObject({ credentials: "omit", redirect: "manual" });
});

it("redirects private downloads without relaying bytes or following the signed URL", async () => {
  const sessionId = createSession(identity, 300);
  const signed = "https://storage.example.test/signed/academy/slip?exp=1";
  const upstream = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", upstream);
  upstream.mockResolvedValueOnce(new Response("private-bytes", {
    status: 302,
    headers: { location: signed, "cache-control": "no-store" },
  }));

  const response = await download(sessionRequest(`/api/academy/assets/${assetId}/download`, {
    method: "GET",
  }, sessionId), { params: Promise.resolve({ assetId }) });
  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe(signed);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(await response.text()).toBe("");
  expect(String(upstream.mock.calls[0]?.[0])).toBe(
    `https://backend.example.test/academy/member/assets/${assetId}/download?license=11111`,
  );
  expect((upstream.mock.calls[0]?.[1] as RequestInit).redirect).toBe("manual");
  expect(new Headers(upstream.mock.calls[0]?.[1]?.headers as HeadersInit).get("authorization")).toBeNull();
  expect(upstream).toHaveBeenCalledTimes(1);
});

it("shares backend-domain-routes for academy member upload and public catalog prefix", async () => {
  const sessionId = createSession(identity, 300);
  const upstream = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", upstream);
  upstream.mockResolvedValueOnce(Response.json(intent));
  const posted = await backendPost(sessionRequest("/api/backend/academy/member/upload", {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify({ filename: "slip.jpg", declaredMime: "image/jpeg", size: 32 }),
  }, sessionId), { params: Promise.resolve({ path: ["academy", "member", "upload"] }) });
  expect(posted.status).toBe(200);
  expect(String(upstream.mock.calls[0]?.[0])).toBe("https://backend.example.test/academy/member/upload");
  expect(JSON.parse(String(upstream.mock.calls[0]?.[1]?.body)).pharmacistLicense).toBe("11111");

  upstream.mockResolvedValueOnce(Response.json([]));
  const listed = await backendGet(sessionRequest("/api/backend/academy/courses", { method: "GET" }), {
    params: Promise.resolve({ path: ["academy", "courses"] }),
  });
  expect(listed.status).toBe(200);
  expect(String(upstream.mock.calls[1]?.[0])).toBe("https://backend.example.test/academy/courses");

  upstream.mockResolvedValueOnce(Response.json([]));
  expect(await backendFetch("/academy/courses")).toEqual([]);
  expect(String(upstream.mock.calls[2]?.[0])).toBe("https://backend.example.test/academy/courses");
});

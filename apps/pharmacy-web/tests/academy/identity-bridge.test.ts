// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("server-only", () => ({}));
import { POST as enroll } from "../../app/api/academy/courses/[id]/enroll/route";
import { createSession } from "../../lib/server/pharmacy-auth/session-store";
import { getAcademyMemberActor } from "../../lib/server/academy-bridge";

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

function request(path: string, sessionId?: string, headers: Record<string, string> = {}) {
  const cookie = sessionId ? `pharmacy_session=${sessionId}` : "";
  return new NextRequest(origin + path, {
    method: "POST",
    headers: { ...headers, ...(cookie ? { cookie } : {}) },
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

it("forwards the verified member license and denies CSRF-less mutations", async () => {
  const sessionId = createSession(identity, 300);
  const actor = getAcademyMemberActor(request("/api/academy/courses/3/enroll", sessionId));
  expect(actor).toMatchObject({
    kind: "pharmacy-mock",
    subject: "mock-user-11111",
    pharmacistLicense: "11111",
  });
  expect(actor?.pharmacistLicense).not.toBe("22222");

  const upstream = vi.fn<typeof fetch>();
  vi.stubGlobal("fetch", upstream);
  const denied = await enroll(request("/api/academy/courses/3/enroll", sessionId), {
    params: Promise.resolve({ id: "3" }),
  });
  expect(denied.status).toBe(403);
  expect(upstream).not.toHaveBeenCalled();

  upstream.mockResolvedValueOnce(Response.json({ success: true, enrollmentId: 9 }));
  const allowed = await enroll(request("/api/academy/courses/3/enroll", sessionId, { origin }), {
    params: Promise.resolve({ id: "3" }),
  });
  expect(allowed.status).toBe(200);
  expect(upstream).toHaveBeenCalledTimes(1);
  const forwarded = JSON.parse(String(upstream.mock.calls[0]?.[1]?.body));
  expect(forwarded.pharmacistLicense).toBe("11111");
  expect(forwarded.pharmacistLicense).not.toBe("22222");
  expect((upstream.mock.calls[0]?.[1]?.headers as Record<string, string>)["x-academy-bridge"]).toBe("fake-academy-secret");
  expect((upstream.mock.calls[0]?.[1]?.headers as Record<string, string>).authorization).toBeUndefined();
});

// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { GET as getPharmacyMe } from "@/app/api/auth/pharmacy/me/route";
import { POST as establishConferenceSession } from "@/app/api/conference/session/route";
import { shouldReloadForStaleSession } from "@/lib/conference/session-recovery";
import { createSession } from "@/lib/server/pharmacy-auth/session-store";

const request = (path: string, sessionId?: string, conferenceCookies?: string) => {
  const cookie = [`pharmacy_session=${sessionId ?? ""}`, conferenceCookies ?? ""].filter(Boolean).join("; ");
  return new NextRequest(`http://localhost${path}`, { headers: cookie ? { cookie } : undefined });
};

beforeEach(() => {
  vi.stubEnv("BACKEND_API_URL", "https://backend.example.test");
  vi.stubEnv("PHARMACY_WEB_ORIGIN", "https://app.example.test");
  vi.stubEnv("PHARMACY_SESSION_SECRET", "fake-pharmacy-session-secret-at-least-32-ch");
  vi.stubEnv("ACADEMY_BRIDGE_KEY", "fake-academy-secret");
  vi.stubEnv("CONFERENCE_API_URL", "https://conference.example.test");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("stale Pharmacy session recovery", () => {
  it("does not clear or reload when no Pharmacy cookie was sent", async () => {
    const response = await getPharmacyMe(request("/api/auth/pharmacy/me"));
    const problem = await response.json();
    expect(response.status).toBe(401);
    expect(problem).toMatchObject({ code: "PHARMACY_SESSION_REQUIRED" });
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(shouldReloadForStaleSession(problem)).toBe(false);
  });

  it("clears a present-but-invalid cookie and requests one recovery reload", async () => {
    const response = await getPharmacyMe(request("/api/auth/pharmacy/me", "stale-session-id"));
    const problem = await response.json();
    expect(response.status).toBe(401);
    expect(problem).toMatchObject({ code: "PHARMACY_SESSION_INVALID", meta: { sessionCleared: true } });
    expect(response.headers.get("set-cookie")).toContain("pharmacy_session=");
    expect(response.headers.get("set-cookie")).toMatch(/Expires=Thu, 01 Jan 1970 00:00:00 GMT/i);
    expect(shouldReloadForStaleSession(problem)).toBe(true);
  });

  it("keeps a valid Pharmacy session", async () => {
    const sessionId = createSession({ provider: "pharmacy-council", subject: "test-user", pharmacistLicense: "ภ999", firstName: "ทดสอบ", lastName: "ระบบ", email: null, phone: null }, 300);
    const response = await getPharmacyMe(request("/api/auth/pharmacy/me", sessionId));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ user: { pharmacistLicense: "ภ999" } });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("re-exchanges when the existing Conference session belongs to another account", async () => {
    const sessionId = createSession({ provider: "pharmacy-council", subject: "new-user", pharmacistLicense: "ภ111", firstName: "บัญชีใหม่", lastName: "ทดสอบ", email: null, phone: null }, 300);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ pharmacistLicense: "99999" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ established: true, exchanged: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await establishConferenceSession(request("/api/conference/session", sessionId, "conference_attendee_session=old; conference_csrf=csrf"));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ exchanged: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/api/v1/auth/pharmacy/exchange");
  });

  it("also clears stale Pharmacy state before Conference exchange", async () => {
    const response = await establishConferenceSession(request("/api/conference/session", "stale-conference-session"));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "PHARMACY_SESSION_INVALID", meta: { sessionCleared: true } });
    expect(response.headers.get("set-cookie")).toMatch(/Expires=Thu, 01 Jan 1970 00:00:00 GMT/i);
  });
});

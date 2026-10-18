// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("server-only", () => ({}));
import { GET, POST } from "../../app/api/conference/[...path]/route";

const origin = "https://app.example.test";
const conference = "https://conference.example.test";

function request(path: string, method = "GET", headers: Record<string, string> = {}, body?: string) {
  return new NextRequest(origin + "/api/conference" + path, {
    method,
    headers: { ...headers },
    ...(body === undefined ? {} : { body }),
  });
}

async function call(path: string, method = "GET", headers: Record<string, string> = {}, body?: string) {
  const handler = method === "POST" ? POST : GET;
  return handler(request(path, method, headers, body), {
    params: Promise.resolve({ path: path.replace(/^\//, "").split("/") }),
  });
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("BACKEND_API_URL", "https://backend.example.test");
  vi.stubEnv("PHARMACY_WEB_ORIGIN", origin);
  vi.stubEnv("PHARMACY_SESSION_SECRET", "fake-pharmacy-session-secret-at-least-32-ch");
  vi.stubEnv("ACADEMY_BRIDGE_KEY", "fake-academy-secret");
  vi.stubEnv("CONFERENCE_API_URL", conference);
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

it("forwards only attendee cookies and never staff authorization", async () => {
  const upstream = vi.mocked(fetch);
  upstream.mockResolvedValue(new Response("{}", { status: 200, headers: { "set-cookie": "conference_attendee_session=a; Path=/", "content-type": "application/json" } }));
  const response = await call("/me", "GET", {
    cookie: "conference_attendee_session=a; conference_csrf=c; pharmacy_session=secret; __Host-pharmacy_staff=staff",
  });
  expect(response.status).toBe(400);
  expect(upstream).not.toHaveBeenCalled();

  const allowed = await call("/me", "GET", {
    cookie: "conference_attendee_session=a; conference_csrf=c; pharmacy_session=secret",
  });
  expect(allowed.status).toBe(200);
  expect(String(upstream.mock.calls[0]?.[0])).toBe(`${conference}/api/v1/me`);
  const forwarded = new Headers(upstream.mock.calls[0]?.[1]?.headers);
  expect(forwarded.get("authorization")).toBeNull();
  expect(forwarded.get("cookie")).toBe("conference_attendee_session=a; conference_csrf=c");
  expect(allowed.headers.get("cache-control")).toBe("no-store");
});

it("denies admin paths, traversal, destination overrides and bearer tokens before upstream", async () => {
  const upstream = vi.mocked(fetch);
  for (const path of ["/admin/orders", "/public/../me", "/https://evil.test/me"]) {
    expect((await call(path)).status).toBeGreaterThanOrEqual(400);
  }
  expect((await call("/me", "GET", { authorization: "Bearer staff" })).status).toBe(400);
  expect(upstream).not.toHaveBeenCalled();
});

it("copies multiple conference Set-Cookie values from exchange", async () => {
  const upstream = vi.mocked(fetch);
  const headers = new Headers({ "content-type": "application/json" });
  headers.append("set-cookie", "conference_attendee_session=a; Path=/");
  headers.append("set-cookie", "conference_csrf=c; Path=/");
  upstream.mockResolvedValue(new Response("{}", { status: 200, headers }));
  const response = await call("/auth/pharmacy/exchange", "POST", { "content-type": "application/json", origin }, "{}");
  expect(response.status).toBe(200);
  expect(response.headers.getSetCookie()).toHaveLength(2);
  expect(new Headers(upstream.mock.calls[0]?.[1]?.headers).get("authorization")).toBeNull();
});

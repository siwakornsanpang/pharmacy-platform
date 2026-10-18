// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/home",
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <img alt={alt} /> }));
vi.mock("@/features/content/browser-api", () => ({
  getWebSettings: async () => null,
}));

import { AuthProvider, useAuth } from "../../context/AuthContext";
import AppHeader from "../../components/ui/AppHeader";
import { GET as getEnrollments } from "../../app/api/academy/enrollments/route";

function AuthProbe() {
  const { authReady, isLoggedIn, refresh } = useAuth();
  return (
    <div>
      <span data-testid="auth-ready">{String(authReady)}</span>
      <span data-testid="logged-in">{String(isLoggedIn)}</span>
      <button type="button" onClick={() => void refresh()}>retry-auth</button>
    </div>
  );
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

function hang(init?: RequestInit): Promise<Response> {
  return new Promise((_resolve, reject) => {
    const abort = () => reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
    if (init?.signal?.aborted) abort();
    else init?.signal?.addEventListener("abort", abort, { once: true });
  });
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("PHARMACY_POC_MODE", "true");
  vi.stubEnv("BACKEND_API_URL", "https://backend.example.test");
  vi.stubEnv("PHARMACY_WEB_ORIGIN", "https://app.example.test");
  vi.stubEnv("PHARMACY_SESSION_SECRET", "fake-pharmacy-session-secret-at-least-32-ch");
  vi.stubEnv("ACADEMY_BRIDGE_KEY", "fake-academy-secret");
  vi.stubEnv("CONFERENCE_API_URL", "https://conference.example.test");
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

it("renders public children while /me is unresolved and keeps member chrome hidden", () => {
  vi.mocked(fetch).mockImplementation((_url, init) => hang(init));
  render(
    <AuthProvider>
      <AppHeader />
      <AuthProbe />
      <p>public content</p>
    </AuthProvider>,
  );
  expect(screen.getByText("public content")).toBeVisible();
  expect(screen.getByTestId("auth-ready")).toHaveTextContent("false");
  expect(screen.queryByRole("button", { name: "เข้าสู่ระบบเภสัชกร" })).toBeNull();
  expect(screen.queryByText(/สวัสดี/)).toBeNull();
});

it("times out a hung /me once and settles as logged out without blocking public content", async () => {
  vi.useFakeTimers();
  vi.mocked(fetch).mockImplementation((_url, init) => hang(init));
  render(
    <AuthProvider>
      <AuthProbe />
      <p>public content</p>
    </AuthProvider>,
  );
  expect(screen.getByText("public content")).toBeVisible();
  expect(screen.getByTestId("auth-ready")).toHaveTextContent("false");
  expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(10_000);
  });
  expect(screen.getByTestId("auth-ready")).toHaveTextContent("true");
  expect(screen.getByTestId("logged-in")).toHaveTextContent("false");
});

it("reloads once for a stale cookie and does not loop", async () => {
  const reload = vi.fn();
  vi.stubGlobal("location", { ...window.location, reload, href: "http://localhost/home" });
  vi.mocked(fetch).mockResolvedValue(
    json({ code: "PHARMACY_SESSION_INVALID", meta: { sessionCleared: true } }, 401),
  );
  render(
    <AuthProvider>
      <AuthProbe />
      <p>public content</p>
    </AuthProvider>,
  );
  await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  screen.getByRole("button", { name: "retry-auth" }).click();
  await waitFor(() => expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(1));
  expect(reload).toHaveBeenCalledTimes(1);
  expect(screen.getByText("public content")).toBeVisible();
});

it("denies member-only Academy reads without a session", async () => {
  const privateApiResponse = await getEnrollments(
    new NextRequest("https://app.example.test/api/academy/enrollments"),
  );
  expect(privateApiResponse.status).toBe(401);
});

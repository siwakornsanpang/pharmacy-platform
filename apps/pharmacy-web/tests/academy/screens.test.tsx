// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AcademyCourseDetail, AcademyLearningState } from "@pharmacy/contracts/academy";
import { academyCommandKey, getCourse, payMock, resetAcademyCommandKeys, uploadAcademySlip } from "../../features/academy/api";

const navigate = vi.fn();
const params = { id: "1" };
vi.mock("next/navigation", () => ({
  useParams: () => params,
  useRouter: () => ({ push: navigate }),
}));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <img alt={alt} /> }));
vi.mock("@/components/member/learning/LearningBanner", () => ({ default: () => null }));

import AcademyCourseDetailPage from "../../app/(member)/05_learning/[id]/page";

const courseA: AcademyCourseDetail = {
  id: 1, title: "course A", summary: "A", coverUrl: null, durationLabel: "1 ชม.", cpeLabel: "1 CPE",
  categoryName: null, categoryColor: null, instructorName: "ครูเอ", instructorTitle: null,
  studentCount: 0, rating: null, reviewCount: 0, outcomes: ["รู้ A"], isFeatured: false,
  format: "online", venue: null, trainingStartsAt: null, trainingEndsAt: null,
  cpeCredits: "1", conferenceCode: null, price: "100", audience: "all",
  instructorExpertise: null, instructorImageUrl: null, lessons: [],
};
const courseB = { ...courseA, id: 2, title: "course B", outcomes: ["รู้ B"] };
const learning: AcademyLearningState = {
  enrolled: false, format: "online", venue: null, trainingStartsAt: null, trainingEndsAt: null,
  orderStatus: null, progressPercent: 0, price: "100", hasExam: false, examPassed: false, exam: [], lessons: [],
};

const intent = {
  id: "11111111-1111-4111-8111-111111111111",
  uploadUrl: "https://upload.example.test/api/media/uploads/11111111-1111-4111-8111-111111111111",
  ticket: "a".repeat(64),
  expiresAt: "2026-10-15T12:05:00.000Z",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
}

beforeEach(() => {
  resetAcademyCommandKeys();
  navigate.mockReset();
  params.id = "1";
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it("keeps pay enabled after a rejected mock payment and does not redirect", async () => {
  const fetchMock = vi.mocked(fetch);
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/api/backend/academy/courses/1")) return json(courseA);
    if (url.endsWith("/api/academy/courses/1")) return json(learning);
    if (url.endsWith("/api/academy/courses/1/order")) return json({ message: "ชำระเงินจำลองไม่สำเร็จ" }, 503);
    throw new Error(url);
  });
  render(<AcademyCourseDetailPage />);
  const button = await screen.findByRole("button", { name: "ชำระเงินจำลอง" });
  fireEvent.click(button);
  await waitFor(() => expect(screen.getByText("ชำระเงินจำลองไม่สำเร็จ")).toBeVisible());
  expect(screen.getByRole("button", { name: "ชำระเงินจำลอง" })).toBeEnabled();
  expect(navigate).not.toHaveBeenCalled();
  const orderCall = fetchMock.mock.calls.find((call) => String(call[0]).endsWith("/order"));
  expect(new Headers(orderCall?.[1]?.headers).has("authorization")).toBe(false);
});

it("does not let a slower course A response overwrite course B", async () => {
  let releaseA: (value: Response) => void = () => undefined;
  const fetchMock = vi.mocked(fetch);
  fetchMock.mockImplementation(async (input) => {
    const url = String(input);
    if (url.endsWith("/api/backend/academy/courses/1"))
      return new Promise<Response>((resolve) => { releaseA = resolve; });
    if (url.endsWith("/api/backend/academy/courses/2")) return json(courseB);
    if (url.includes("/api/academy/courses/")) return json(learning);
    throw new Error(url);
  });
  const pendingA = getCourse("1");
  await expect(getCourse("2")).resolves.toMatchObject({ title: "course B" });
  releaseA(json(courseA));
  await expect(pendingA).rejects.toMatchObject({ status: 499 });

  params.id = "2";
  render(<AcademyCourseDetailPage />);
  expect(await screen.findByText("course B")).toBeVisible();
  expect(screen.queryByText("course A")).toBeNull();
});

it("reuses the same mock-pay key until the fingerprint changes", async () => {
  const fetchMock = vi.mocked(fetch);
  fetchMock.mockResolvedValue(json({ message: "busy" }, 503));
  const intentKey = academyCommandKey("pay", "9");
  await expect(payMock("9", intentKey)).rejects.toMatchObject({ status: 503 });
  await expect(payMock("9", academyCommandKey("pay", "9"))).rejects.toMatchObject({ status: 503 });
  const sentKeys = fetchMock.mock.calls.map((call) => new Headers(call[1]?.headers).get("idempotency-key"));
  expect(sentKeys).toEqual([intentKey, intentKey]);
  expect(academyCommandKey("pay", "10")).not.toBe(intentKey);
  expect(fetchMock.mock.calls.some((call) => new Headers(call[1]?.headers).has("authorization"))).toBe(false);
});

it("resets busy after the member mutation timeout", async () => {
  const fetchMock = vi.mocked(fetch);
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/api/backend/academy/courses/1")) return json(courseA);
    if (url.endsWith("/api/academy/courses/1") && (init?.method ?? "GET") === "GET") return json(learning);
    return new Promise((_, reject) => {
      const onAbort = () => reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
      if (init?.signal?.aborted) onAbort();
      else init?.signal?.addEventListener("abort", onAbort, { once: true });
    });
  });
  render(<AcademyCourseDetailPage />);
  const button = await screen.findByRole("button", { name: "ชำระเงินจำลอง" });
  vi.useFakeTimers();
  fireEvent.click(button);
  await vi.advanceTimersByTimeAsync(10000);
  vi.useRealTimers();
  await waitFor(() => expect(screen.getByRole("button", { name: "ชำระเงินจำลอง" })).toBeEnabled());
  expect(navigate).not.toHaveBeenCalled();
});

it("uploads a slip with credentials omitted and no staff authorization", async () => {
  const fetchMock = vi.mocked(fetch);
  fetchMock.mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.endsWith("/api/academy/upload")) return json(intent);
    if (url === intent.uploadUrl) {
      expect(init?.credentials).toBe("omit");
      expect(new Headers(init?.headers).has("authorization")).toBe(false);
      expect(new Headers(init?.headers).has("x-academy-bridge")).toBe(false);
      return json({
        id: "22222222-2222-4222-8222-222222222222",
        owner: { domain: "academy", type: "order", id: "draft:1", slot: "slip" },
        kind: "academy-slip",
        visibility: "private",
      });
    }
    throw new Error(url);
  });
  const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "slip.jpg", { type: "image/jpeg" });
  const staged = await uploadAcademySlip(file);
  expect(staged.kind).toBe("academy-slip");
});

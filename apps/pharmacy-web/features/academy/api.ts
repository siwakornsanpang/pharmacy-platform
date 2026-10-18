import { browserApi } from "@/lib/api/browser";
import type { AcademyCertificate, AcademyCommandResult, AcademyCourse, AcademyCourseDetail, AcademyLearningState } from "@pharmacy/contracts/academy";
import type { StagedAsset, UploadIntent } from "@pharmacy/contracts/media";
import { uploadWithIntent } from "./upload";
import type { AcademyCategory, AcademyEnrollment, AcademyInstructor, AcademyReview, AcademyStats } from "./mapping";

const commandKeys = new Map<string, string>();
let catalogGeneration = 0;
let learningGeneration = 0;

export function academyCommandKey(scope: string, fingerprint: string) {
  const id = `${scope}:${fingerprint}`;
  const existing = commandKeys.get(id);
  if (existing) return existing;
  const key = crypto.randomUUID();
  commandKeys.set(id, key);
  return key;
}

export function resetAcademyCommandKeys() {
  commandKeys.clear();
  catalogGeneration = 0;
  learningGeneration = 0;
}

class AcademyClientError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "AcademyClientError";
  }
}

async function memberApi<T>(path: string, init: RequestInit = {}, timeoutMs = 10000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (init.signal?.aborted) controller.abort(init.signal.reason);
  else init.signal?.addEventListener("abort", () => controller.abort(init.signal?.reason), { once: true });
  try {
    const headers = new Headers(init.headers);
    if (headers.has("authorization") || headers.has("x-academy-bridge"))
      throw new AcademyClientError("ไม่มีสิทธิ์เรียกเส้นนี้", 400);
    const response = await fetch(path, {
      ...init,
      headers,
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new AcademyClientError(String((data as { message?: string }).message || "Academy request failed"), response.status);
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

export function getAcademyCategories(signal?: AbortSignal) {
  return browserApi<AcademyCategory[]>("/academy/categories", { signal, cache: "no-store" });
}

export function getAcademyCourses(params?: { category?: string; q?: string; featured?: boolean }, signal?: AbortSignal) {
  const query = new URLSearchParams();
  if (params?.category) query.set("category", params.category);
  if (params?.q) query.set("q", params.q);
  if (params?.featured) query.set("featured", "1");
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return browserApi<AcademyCourse[]>(`/academy/courses${suffix}`, { signal, cache: "no-store" });
}

export async function getCourse(id: string, signal?: AbortSignal): Promise<AcademyCourseDetail> {
  const generation = ++catalogGeneration;
  const course = await browserApi<AcademyCourseDetail>(`/academy/courses/${id}`, { signal, cache: "no-store" });
  if (generation !== catalogGeneration) throw new AcademyClientError("stale", 499);
  return course;
}

export const getAcademyCourse = getCourse;

export function getAcademyInstructors(signal?: AbortSignal) {
  return browserApi<AcademyInstructor[]>("/academy/instructors", { signal, cache: "no-store" });
}

export function getAcademyReviews(signal?: AbortSignal) {
  return browserApi<AcademyReview[]>("/academy/reviews", { signal, cache: "no-store" });
}

export function getAcademyStats(signal?: AbortSignal) {
  return browserApi<AcademyStats>("/academy/stats", { signal, cache: "no-store" });
}

export async function getLearning(id: string, signal?: AbortSignal): Promise<AcademyLearningState> {
  const generation = ++learningGeneration;
  const state = await memberApi<AcademyLearningState>(`/api/academy/courses/${id}`, { signal });
  if (generation !== learningGeneration) throw new AcademyClientError("stale", 499);
  return state;
}

export function listEnrollments(signal?: AbortSignal) {
  return memberApi<AcademyEnrollment[]>("/api/academy/enrollments", { signal });
}

export function getCertificate(id: string, signal?: AbortSignal) {
  return memberApi<AcademyCertificate>(`/api/academy/courses/${id}/certificate`, { signal });
}

export function enrollFree(id: string, signal?: AbortSignal) {
  return memberApi<AcademyCommandResult>(`/api/academy/courses/${id}/enroll`, { method: "POST", signal });
}

export function cancelEnrollment(id: string, signal?: AbortSignal) {
  return memberApi<AcademyCommandResult>(`/api/academy/courses/${id}/cancel`, { method: "POST", signal });
}

export function payMock(id: string, key: string, signal?: AbortSignal) {
  return memberApi<AcademyCommandResult>(`/api/academy/courses/${id}/order`, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: "{}",
    signal,
  });
}

export function refundMock(id: string, reason: string, key: string, signal?: AbortSignal) {
  return memberApi<AcademyCommandResult>(`/api/academy/courses/${id}/refund`, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify({ reason }),
    signal,
  });
}

export function completeLesson(lessonId: number, answers: string[], signal?: AbortSignal) {
  return memberApi<{ success: true; progressPercent: number }>(`/api/academy/lessons/${lessonId}/complete`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ answers }),
    signal,
  });
}

export function submitExam(id: string, answers: string[], signal?: AbortSignal) {
  return memberApi<{ success: true; progressPercent: number }>(`/api/academy/courses/${id}/exam`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ answers }),
    signal,
  });
}

export async function uploadAcademySlip(file: File, signal?: AbortSignal): Promise<StagedAsset> {
  const intent = await memberApi<UploadIntent>("/api/academy/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: file.name || "slip.jpg",
      declaredMime: file.type || "image/jpeg",
      size: file.size,
    }),
    signal,
  });
  return uploadWithIntent(intent, file, signal);
}

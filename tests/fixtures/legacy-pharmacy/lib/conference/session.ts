import { ConferenceApiError } from "./api";
import type { ProblemDetails } from "./types";

export async function ensureConferenceSession() {
  const response = await fetch("/api/conference/session", { method: "POST", credentials: "include", cache: "no-store" });
  if (!response.ok) {
    let problem: ProblemDetails = { status: response.status, code: "CONFERENCE_IDENTITY_UNAVAILABLE", title: "ไม่สามารถตรวจสอบสิทธิ์ได้" };
    try { problem = await response.json() as ProblemDetails; } catch { /* use fallback */ }
    throw new ConferenceApiError(problem);
  }
}

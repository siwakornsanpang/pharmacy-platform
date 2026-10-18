import type {
  CheckoutOrder,
  ConferenceAttendeeProfile,
  EventDetail,
  MemberEventCard,
  PaginatedEvents,
  PaymentAttempt,
  PersonalizedOffering,
  ProblemDetails,
  PublicEventCard,
  TaxInvoiceInput,
} from "./types";

export class ConferenceApiError extends Error {
  constructor(readonly problem: ProblemDetails) { super(problem.detail || problem.title); }
}

export function conferenceAssetUrl(value: string | null) {
  if (!value) return "/images/public/meeting/meeting1.jpg";
  return value.startsWith("/api/v1/") ? `/api/conference/${value.slice("/api/v1/".length)}` : value;
}

function csrfToken() {
  if (typeof document === "undefined") return "";
  const prefix = "conference_csrf=";
  const cookie = document.cookie.split(";").map((value) => value.trim()).find((value) => value.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : "";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  const method = (init.method ?? "GET").toUpperCase();
  if (!["GET", "HEAD"].includes(method)) {
    const csrf = csrfToken();
    if (csrf) headers.set("x-csrf-token", csrf);
  }
  const response = await fetch(`/api/conference/${path.replace(/^\/+/, "")}`, {
    ...init,
    method,
    headers,
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) {
    let problem: ProblemDetails = { status: response.status, code: "CONFERENCE_REQUEST_FAILED", title: "Conference request failed" };
    try { problem = await response.json() as ProblemDetails; } catch { /* keep fallback */ }
    throw new ConferenceApiError(problem);
  }
  return response.json() as Promise<T>;
}

function query(params: { page: number; pageSize: number; search?: string; scope?: string; sort?: string }) {
  const value = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize), scope: params.scope ?? "all", sort: params.sort ?? "soonest" });
  if (params.search?.trim()) value.set("search", params.search.trim());
  return value.toString();
}

export const getPublicEvents = (params: { page: number; pageSize: number; search?: string; scope?: string; sort?: string }) =>
  request<PaginatedEvents<PublicEventCard>>(`public/events?${query(params)}`);

export const getMemberEvents = (params: { page: number; pageSize: number; search?: string; scope?: string; sort?: string }) =>
  request<PaginatedEvents<MemberEventCard>>(`me/events?${query(params)}`);

export const getEventDetail = (eventId: string) => request<EventDetail>(`public/events/${encodeURIComponent(eventId)}`);

export const getPersonalizedOfferings = (eventId: string) =>
  request<{ data: PersonalizedOffering[] }>(`me/events/${encodeURIComponent(eventId)}/ticket-offerings`);

export const getConferenceProfile = () => request<ConferenceAttendeeProfile>("me");

export const createOrder = (input: {
  eventId: string;
  ticketTypeIds: string[];
  expectedTotalAmount: string;
  expectedCurrency: string;
  taxInvoice?: TaxInvoiceInput;
}, idempotencyKey: string) => request<CheckoutOrder>("orders", {
  method: "POST",
  headers: { "idempotency-key": idempotencyKey },
  body: JSON.stringify(input),
});

export const getOrder = (orderId: string) => request<CheckoutOrder>(`orders/${encodeURIComponent(orderId)}`);

export const createPaymentAttempt = (orderId: string, idempotencyKey: string) => request<PaymentAttempt>(`orders/${encodeURIComponent(orderId)}/payment-attempts`, {
  method: "POST",
  headers: { "idempotency-key": idempotencyKey },
  body: JSON.stringify({ provider: "ktb" }),
});

export const confirmMockPayment = (orderId: string, attemptId: string, outcome: "succeeded" | "failed", idempotencyKey: string) =>
  request<{ settlement: { result: "applied" | "alreadyApplied" | "failed" }; order: CheckoutOrder }>(`orders/${encodeURIComponent(orderId)}/payment-attempts/${encodeURIComponent(attemptId)}/mock-confirmations`, {
    method: "POST",
    headers: { "idempotency-key": idempotencyKey },
    body: JSON.stringify({ outcome }),
  });

export const cancelOrder = (orderId: string, idempotencyKey: string) => request<CheckoutOrder>(`orders/${encodeURIComponent(orderId)}/cancellations`, {
  method: "POST",
  headers: { "idempotency-key": idempotencyKey },
});

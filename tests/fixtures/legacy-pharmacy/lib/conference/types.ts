export interface EventAvailability {
  registered: number;
  held: number;
  capacity: number | null;
  remaining: number | null;
  status: "upcoming" | "available" | "full" | "closed" | "ended" | "configuration_error";
}

export interface PublicEventCard {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string | null;
  shortName: string | null;
  locationName: string | null;
  startAt: string;
  endAt: string;
  cpeCredits: string;
  thumbnailImageUrl: string | null;
  lifecycleStatus: "upcoming" | "ongoing" | "past";
  eligibleCategories: Array<{ code: string; nameTh: string }>;
  availability: EventAvailability;
}

export interface MemberEventCard extends PublicEventCard {
  eligibility: {
    status: "available" | "upcoming" | "full" | "closed" | "ended" | "already_registered" | "approval_required" | "configuration_error";
    canRegister: boolean;
    reasonCode: string | null;
    availableOfferingCount: number;
  };
}

export interface PaginatedEvents<T> {
  data: T[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export interface EventAgenda {
  id: string;
  startTime: string;
  endTime: string;
  content: string;
  displayOrder: number;
}

export interface EventDocument {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  displayOrder: number;
  downloadUrl: string;
}

export interface EventDetail {
  id: string;
  code: string;
  nameTh: string;
  nameEn: string | null;
  shortName: string | null;
  description: string | null;
  locationName: string | null;
  mapEmbedUrl: string | null;
  startAt: string;
  endAt: string;
  cpeCredits: string;
  thumbnailImageUrl: string | null;
  coverImageUrl: string | null;
  agendas: EventAgenda[];
  documents: EventDocument[];
  availability: EventAvailability;
}

export interface PersonalizedOffering {
  ticketId: string;
  ticketCode: string;
  ticketName: string;
  kind: "primary" | "supplementary";
  quota: number | null;
  saleStartAt: string | null;
  saleEndAt: string | null;
  priceId: string;
  amount: string;
  currency: string;
  priceLabel: string | null;
  canPurchase: boolean;
  reasonCode: string | null;
  requiresPrimary: boolean;
  availability: {
    capacity: number | null;
    registered: number;
    held: number;
    remaining: number | null;
  };
  sessions: Array<{ id: string; code: string; name: string }>;
}

export interface ConferenceAttendeeProfile {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  pharmacistLicense: string | null;
  attendeeCategoryId: string;
  categoryCode: string;
  approvalStatus: "auto_approved" | "pending" | "approved" | "rejected";
}

export interface TaxInvoiceInput {
  taxpayerType: "individual" | "juristic";
  taxpayerName: string;
  taxId: string;
  branchType: "headOffice" | "branch" | null;
  branchNumber: string | null;
  addressLine: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  email: string;
  phone: string;
}

export type OrderStatus = "awaitingPayment" | "paid" | "expired" | "cancelled" | "partiallyRefunded" | "refunded";

export interface CheckoutOrderItem {
  id: string;
  ticketTypeId: string;
  ticketTypeName: string;
  ticketKind: "primary" | "supplementary";
  priceLabel: string | null;
  amount: string;
  currency: string;
  grantedSessionsSnapshot: Array<{ id: string; code: string; name: string }>;
}

export interface CheckoutRegistration {
  id: string;
  code: string;
  status: "confirmed" | "cancelled";
  issuedAt: string;
  orderItemId: string;
  ticketTypeId: string;
  ticketName: string;
  ticketKind: "primary" | "supplementary";
  qrPayload: string;
  sessions: Array<{ id: string; code: string; name: string; checkedInAt: string | null }>;
}

export interface TaxInvoiceRequest {
  id: string;
  status: "pendingPayment" | "requested" | "issued" | "cancelled";
  taxpayerType: "individual" | "juristic";
  taxpayerName: string;
  maskedTaxId: string;
  branchType: "headOffice" | "branch" | null;
  branchNumber: string | null;
  addressLine: string;
  subdistrict: string;
  district: string;
  province: string;
  postalCode: string;
  email: string;
  phone: string;
  requestedAt: string | null;
}

export interface CheckoutOrder {
  id: string;
  number: string;
  eventId: string;
  status: OrderStatus;
  subtotalAmount: string;
  discountAmount: string;
  totalAmount: string;
  currency: string;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  event?: { id: string; code: string; nameTh: string; locationName: string | null; startAt: string; endAt: string };
  attendee?: { id: string; firstName: string; lastName: string; displayName: string; email: string | null; phone: string | null };
  items: CheckoutOrderItem[];
  hold?: { id: string; state: string; expiresAt: string };
  taxInvoice: TaxInvoiceRequest | null;
  payment?: {
    id: string;
    provider: string;
    state: "pending" | "succeeded" | "failed" | "cancelled";
    amount: string;
    currency: string;
    latestAttempt: {
      id: string;
      paymentId: string;
      state: "pending" | "succeeded" | "failed" | "cancelled";
      expiresAt: string | null;
      createdAt: string;
      updatedAt: string;
    } | null;
  } | null;
  registrations?: CheckoutRegistration[];
}

export interface PaymentAttempt {
  id: string;
  paymentId: string;
  orderId: string;
  state: "pending" | "succeeded" | "failed" | "cancelled";
  amount: string;
  currency: string;
  provider: "ktb";
  mode: "mock";
  redirectUrl: null;
  expiresAt: string | null;
  reusedPending: boolean;
  createdAt: string;
}

export interface ProblemDetails {
  status: number;
  code: string;
  title: string;
  detail?: string;
  requestId?: string;
  errors?: Array<{ path: string; code: string; message: string }>;
  meta?: Record<string, unknown>;
}

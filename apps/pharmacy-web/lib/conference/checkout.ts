import type { EventDetail, PersonalizedOffering, TaxInvoiceInput } from "./types";

export interface MeetingRegistrationAction {
  disabled: boolean;
  label: string;
}

export const emptyTaxInvoice = (): TaxInvoiceInput => ({
  taxpayerType: "individual",
  taxpayerName: "",
  taxId: "",
  branchType: null,
  branchNumber: null,
  addressLine: "",
  subdistrict: "",
  district: "",
  province: "",
  postalCode: "",
  email: "",
  phone: "",
});

export function amountToMinorUnits(value: string) {
  const [major = "0", fraction = ""] = value.split(".");
  return Number(major) * 100 + Number(fraction.padEnd(2, "0").slice(0, 2));
}

export function selectedOfferings(offerings: PersonalizedOffering[], primaryId: string, supplementaryIds: Set<string>) {
  return offerings.filter((offering) => offering.ticketId === primaryId || supplementaryIds.has(offering.ticketId));
}

export function selectionTotal(offerings: PersonalizedOffering[]) {
  return offerings.reduce((total, offering) => total + amountToMinorUnits(offering.amount), 0);
}

export function minorUnitsText(value: number) {
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}

export function formatMoney(amount: string | number, currency = "THB") {
  const value = typeof amount === "number" ? amount / 100 : Number(amount);
  return new Intl.NumberFormat("th-TH", { style: "currency", currency, minimumFractionDigits: 2 }).format(value);
}

export function validateTaxInvoice(input: TaxInvoiceInput) {
  const errors: Partial<Record<keyof TaxInvoiceInput, string>> = {};
  const required = ["taxpayerName", "addressLine", "subdistrict", "district", "province", "email", "phone"] as const;
  for (const field of required) if (!input[field].trim()) errors[field] = "กรุณากรอกข้อมูลช่องนี้";
  if (!/^\d{13}$/.test(input.taxId)) errors.taxId = "เลขประจำตัวผู้เสียภาษีต้องมี 13 หลัก";
  if (!/^\d{5}$/.test(input.postalCode)) errors.postalCode = "รหัสไปรษณีย์ต้องมี 5 หลัก";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.email = "รูปแบบอีเมลไม่ถูกต้อง";
  if (input.taxpayerType === "juristic" && !input.branchType) errors.branchType = "กรุณาเลือกสำนักงานใหญ่หรือสาขา";
  if (input.branchType === "branch" && !/^\d{5}$/.test(input.branchNumber ?? "")) errors.branchNumber = "เลขสาขาต้องมี 5 หลัก";
  return errors;
}

export function offeringReason(reasonCode: string | null) {
  const messages: Record<string, string> = {
    APPROVAL_REQUIRED: "บัญชียังไม่ได้รับการอนุมัติ",
    SALE_NOT_STARTED: "ยังไม่เปิดรับลงทะเบียน",
    SALE_ENDED: "ปิดรับลงทะเบียนแล้ว",
    CAPACITY_EXHAUSTED: "ที่นั่งเต็มแล้ว",
    ALREADY_REGISTERED: "ลงทะเบียนรายการนี้แล้ว",
    PRIMARY_TICKET_REQUIRED: "ต้องมีบัตรหลักก่อน",
    CONFIGURATION_ERROR: "รายการยังตั้งค่าไม่สมบูรณ์",
  };
  return reasonCode ? messages[reasonCode] ?? "ไม่สามารถเลือกรายการนี้ได้" : "";
}

export function resolveMeetingRegistrationAction(
  event: Pick<EventDetail, "endAt" | "availability"> | null,
  isLoggedIn: boolean,
  memberError: string,
  offerings: PersonalizedOffering[],
  now = new Date(),
): MeetingRegistrationAction {
  if (!event) return { disabled: true, label: "ไม่สามารถลงทะเบียน" };
  if (new Date(event.endAt) <= now || event.availability.status === "ended") {
    return { disabled: true, label: "กิจกรรมสิ้นสุดแล้ว" };
  }
  if (!isLoggedIn) return { disabled: false, label: "เข้าสู่ระบบเพื่อลงทะเบียน" };
  if (memberError) return { disabled: true, label: "ไม่สามารถตรวจสอบสิทธิ์ได้" };

  const hasConfirmedPrimary = offerings.some(
    (offering) => offering.kind === "primary" && offering.reasonCode === "ALREADY_REGISTERED",
  );
  if (hasConfirmedPrimary) return { disabled: true, label: "ลงทะเบียนแล้ว" };

  if (event.availability.status === "full") return { disabled: true, label: "ที่นั่งเต็มแล้ว" };
  if (offerings.some((offering) => offering.canPurchase)) return { disabled: false, label: "ลงทะเบียนเข้าร่วม" };

  const primaryReason = offerings.find((offering) => offering.kind === "primary")?.reasonCode;
  const reasonCode = primaryReason ?? offerings.find((offering) => offering.reasonCode)?.reasonCode ?? null;
  return { disabled: true, label: offeringReason(reasonCode) || "ยังไม่เปิดรับหรือไม่มีสิทธิ์" };
}

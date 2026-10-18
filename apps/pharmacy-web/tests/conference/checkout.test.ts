import { describe, expect, it } from "vitest";
import { amountToMinorUnits, minorUnitsText, resolveMeetingRegistrationAction, validateTaxInvoice } from "@/lib/conference/checkout";
import type { EventDetail, PersonalizedOffering, TaxInvoiceInput } from "@/lib/conference/types";

const eventRegistrationState = (status: EventDetail["availability"]["status"] = "available") => ({
  endAt: "2026-12-31T17:00:00.000Z",
  availability: { registered: 1, held: 0, capacity: null, remaining: null, status },
});

const offering = (input: Partial<PersonalizedOffering> = {}): PersonalizedOffering => ({
  ticketId: "ticket-primary", ticketCode: "PRIMARY", ticketName: "Pharmacist", kind: "primary",
  quota: null, saleStartAt: null, saleEndAt: null, priceId: "price-primary", amount: "2400.00",
  currency: "THB", priceLabel: null, canPurchase: true, reasonCode: null, requiresPrimary: false,
  availability: { capacity: null, registered: 1, held: 0, remaining: null }, sessions: [], ...input,
});

describe("conference checkout helpers", () => {
  it("adds money using minor units", () => {
    expect(amountToMinorUnits("2400.00") + amountToMinorUnits("0.20")).toBe(240020);
    expect(minorUnitsText(240020)).toBe("2400.20");
  });

  it("validates conditional branch fields", () => {
    const input: TaxInvoiceInput = {
      taxpayerType: "juristic", taxpayerName: "บริษัท ตัวอย่าง จำกัด", taxId: "0100000000001",
      branchType: "branch", branchNumber: null, addressLine: "99 ถนนตัวอย่าง", subdistrict: "ตัวอย่าง",
      district: "ตัวอย่าง", province: "กรุงเทพมหานคร", postalCode: "10000", email: "a@example.com", phone: "020000000",
    };
    expect(validateTaxInvoice(input).branchNumber).toBeTruthy();
    expect(validateTaxInvoice({ ...input, branchNumber: "00001" })).toEqual({});
  });

  it("shows a disabled registered state for an existing confirmed primary registration", () => {
    const result = resolveMeetingRegistrationAction(
      eventRegistrationState(),
      true,
      "",
      [offering({ canPurchase: false, reasonCode: "ALREADY_REGISTERED" })],
      new Date("2026-07-31T00:00:00.000Z"),
    );

    expect(result).toEqual({ disabled: true, label: "ลงทะเบียนแล้ว" });
  });

  it("keeps the full state for attendees without an existing registration", () => {
    const result = resolveMeetingRegistrationAction(
      eventRegistrationState("full"),
      true,
      "",
      [offering({ canPurchase: false, reasonCode: "CAPACITY_EXHAUSTED" })],
      new Date("2026-07-31T00:00:00.000Z"),
    );

    expect(result).toEqual({ disabled: true, label: "ที่นั่งเต็มแล้ว" });
  });

  it("keeps checkout enabled for an eligible attendee", () => {
    const result = resolveMeetingRegistrationAction(
      eventRegistrationState(),
      true,
      "",
      [offering()],
      new Date("2026-07-31T00:00:00.000Z"),
    );

    expect(result).toEqual({ disabled: false, label: "ลงทะเบียนเข้าร่วม" });
  });
});

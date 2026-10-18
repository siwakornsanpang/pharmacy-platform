// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import PharmacistDetailCard from "../../components/public/01_home/PharmacistDetailCard";
import EditProfileContent from "../../components/member/profile/EditProfileContent";
import {
  buildLicenseDetailPath,
  buildLicenseSearchPath,
  getFormattedThaiDateTime,
  getPharmacistById,
  searchOptions,
} from "../../components/public/01_home/licenseSearchShared";
import { searchMemberDirectory } from "../../features/member/api";
import { MOCK_HISTORY, paymentLines } from "../../components/public/04_service/e-service/mockData";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/profile/edit",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/image", () => ({ default: ({ alt }: { alt: string }) => <img alt={alt} /> }));
vi.mock("sweetalert2", () => ({ default: { fire: vi.fn(() => Promise.resolve()) } }));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("keeps license search labels, query matching, and detail-back paths on the mock directory", () => {
  expect(searchOptions).toEqual([
    { value: "license", label: "เลขที่ใบอนุญาต" },
    { value: "name", label: "ชื่อ-นามสกุล" },
  ]);
  expect(buildLicenseSearchPath({ type: "license", query: "ภ. 1" })).toBe("/license-search?type=license&q=1");
  expect(buildLicenseSearchPath({ type: "name", firstName: "ภก. กิตติ", lastName: "ใจดี" })).toBe(
    "/license-search?type=name&first=%E0%B8%81%E0%B8%B4%E0%B8%95%E0%B8%95%E0%B8%B4&last=%E0%B9%83%E0%B8%88%E0%B8%94%E0%B8%B5",
  );
  expect(buildLicenseDetailPath("1", "type=name&first=กิตติ")).toBe("/license-search/1?type=name&first=กิตติ");
  expect(searchMemberDirectory("license", "1")).toEqual([getPharmacistById("1")]);
  expect(searchMemberDirectory("name", "กิตติ ใจดี")[0]?.id).toBe("1");
  expect(getFormattedThaiDateTime(new Date(2026, 9, 14, 0, 0, 0))).toBe("14 ตุลาคม 2569 เวลา 00:00 น.");
});

it("expands mock qualifications without calling a network registry", () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  const item = getPharmacistById("1");
  if (!item) throw new Error("missing fixture pharmacist 1");
  const hidden = (item.certificates?.length ?? 0) - 3;
  render(<PharmacistDetailCard item={item} searchTime="14 ตุลาคม 2569 เวลา 00:00 น." />);
  expect(screen.getByText("คุณวุฒิและการอบรม")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: `ดูทั้งหมดอีก ${hidden} รายการ` }));
  expect(screen.getByRole("button", { name: "ย่อรายการ" })).toBeVisible();
  expect(fetchMock).not.toHaveBeenCalled();
});

it("keeps profile save and contact as local mocks", async () => {
  const mockSaveApi = vi.fn();
  const contactMutation = vi.fn();
  vi.stubGlobal("fetch", mockSaveApi);
  render(<EditProfileContent userName="ภก. ทดสอบ" userId="ภ.1" />);
  fireEvent.submit(screen.getByRole("button", { name: /บันทึกข้อมูล/ }).closest("form")!);
  await Promise.resolve();
  expect(mockSaveApi).not.toHaveBeenCalled();
  expect(contactMutation).not.toHaveBeenCalled();

  const contact = readFileSync(
    resolve(__dirname, "../../components/public/09_contact/ContactContent.tsx"),
    "utf8",
  );
  expect(contact).toContain('type="button"');
  expect(contact).not.toMatch(/fetch\(|submitContactInquiry|saveMemberProfile/);
});

it("keeps e-Service mock outcomes on the frozen fixture rows", () => {
  expect(MOCK_HISTORY.map((row) => [row.form, row.paymentStatus, row.processStatus]).slice(0, 3)).toEqual([
    ["สภ.33 คำขอประกาศนียบัตรวิชาชีพ", "ยังไม่ชำระเงิน", "แบบร่างยื่นคำขอ"],
    ["สภ.33 คำขอประกาศนียบัตรวิชาชีพ", "ชำระเงิน", "รอการชำระเงิน"],
    ["สภ.33 คำขอประกาศนียบัตรวิชาชีพ", "ชำระเงินแล้ว", "จัดส่งสำเร็จ"],
  ]);
  expect(paymentLines("sap-33")).toEqual([
    { item: "สภ.33 คำขอประกาศนียบัตรวิชาชีพ", qty: 4, price: 2000 },
    { item: "ค่าธรรมเนียม", qty: 1, price: 20 },
    { item: "ค่าจัดส่ง", qty: 1, price: 50 },
  ]);
});

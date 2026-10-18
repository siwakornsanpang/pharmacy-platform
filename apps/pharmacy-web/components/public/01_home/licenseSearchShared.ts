export {
  type CertificateItem,
  type PharmacistData,
  type SearchType,
  getPharmacistById,
  mockPharmacistsList,
  normalizeLicenseDigits,
  searchOptions,
  stripNameTitles,
} from "@/features/member/mock-data";

import {
  normalizeLicenseDigits,
  stripNameTitles,
  type SearchType,
} from "@/features/member/mock-data";

const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

export function getFormattedThaiDateTime(date: Date = new Date()): string {
  const day = date.getDate();
  const month = THAI_MONTHS[date.getMonth()];
  const year = date.getFullYear() + 543;
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} เวลา ${hours}:${minutes} น.`;
}

export function buildLicenseSearchPath(params: {
  type: SearchType;
  query?: string;
  firstName?: string;
  lastName?: string;
}): string | null {
  const searchParams = new URLSearchParams();
  searchParams.set("type", params.type);

  if (params.type === "license") {
    const q = normalizeLicenseDigits(params.query || "");
    if (!q) return null;
    searchParams.set("q", q);
  } else {
    const first = stripNameTitles(params.firstName || "");
    const last = stripNameTitles(params.lastName || "");
    if (!first && !last) return null;
    if (first) searchParams.set("first", first);
    if (last) searchParams.set("last", last);
  }

  return `/license-search?${searchParams.toString()}`;
}

/** Detail URL; pass current search query so the back link can restore results. */
export function buildLicenseDetailPath(
  id: string | number,
  searchQuery?: string
): string {
  const base = `/license-search/${encodeURIComponent(String(id))}`;
  if (!searchQuery) return base;
  return `${base}?${searchQuery.replace(/^\?/, "")}`;
}

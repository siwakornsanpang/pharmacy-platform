export interface CertificateItem {
  name: string;
  date?: string;
  organization?: string;
}

export interface PharmacistData {
  id?: string | number;
  title?: string;
  name: string;
  licenseNo: string;
  /** License status: normal vs abnormal (with reason) */
  statusType: "normal" | "abnormal";
  statusReason?: string;
  /** CPE continuous education status */
  cpeStatus: "complete" | "incomplete";
  expiryDate?: string;
  replacementInfo?: string;
  contactProvince?: string;
  contactPostalCode?: string;
  image?: string | null;
  /** Newest first — UI shows up to 3 */
  certificates?: CertificateItem[];
}

export const searchOptions = [
  { value: "license", label: "เลขที่ใบอนุญาต" },
  { value: "name", label: "ชื่อ-นามสกุล" },
] as const;

export type SearchType = "license" | "name";

/** Keep only digits for license-number search (e.g. "ภ. 13476" → "13476"). */
export function normalizeLicenseDigits(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

/** Strip common pharmacist/person titles so users can search by name only. */
export function stripNameTitles(value: string): string {
  return value
    .replace(/(ภญ\.|ภก\.|ภ\.|ดร\.|นาย|นางสาว|นาง)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

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

const LAST_NAMES = [
  "ใจดี",
  "รักเรียน",
  "สมบูรณ์",
  "พูนสุข",
  "ศรีสุข",
  "ทองดี",
  "บุญมี",
  "แก้วกาญจน์",
  "วัฒนา",
  "สุวรรณ",
  "จันทร์เพ็ญ",
  "อรุณรุ่ง",
  "มณีรัตน์",
  "ชัยสิทธิ์",
  "ประเสริฐ",
  "วงศ์สว่าง",
  "พงษ์ไทย",
  "ตั้งใจ",
  "สุขใจ",
  "นันทิชา",
];

const PROVINCES = [
  { name: "กรุงเทพมหานคร", zip: "10310" },
  { name: "นนทบุรี", zip: "11000" },
  { name: "ปทุมธานี", zip: "12120" },
  { name: "เชียงใหม่", zip: "50200" },
  { name: "ขอนแก่น", zip: "40000" },
  { name: "สงขลา", zip: "90110" },
  { name: "ชลบุรี", zip: "20130" },
  { name: "นครราชสีมา", zip: "30000" },
  { name: "ภูเก็ต", zip: "83000" },
  { name: "อุบลราชธานี", zip: "34000" },
];

const ABNORMAL_REASONS = [
  "พักใช้ใบอนุญาต 3 เดือน",
  "ถูกเพิกถอนใบอนุญาตชั่วคราว",
  "อยู่ระหว่างสอบสวนวินัย",
  "ใบอนุญาตถูกระงับ",
];

const CERT_POOL = [
  "เภสัชกรรมคลินิก",
  "เภสัชกรรมชุมชน",
  "การสร้างเสริมภูมิคุ้มกันโรคโดยเภสัชกร",
  "เภสัชกรรมอุตสาหการ",
  "การคุ้มครองผู้บริโภคด้านยา",
  "เภสัชกรรมโรงพยาบาล",
  "เภสัชกรรมสมุนไพร",
  "การบริหารร้านยา",
];

function seededRandom(seed: number) {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildCertificates(rand: () => number): CertificateItem[] {
  const count = 5 + Math.floor(rand() * 4); // 5–8 items; UI shows latest 3 then expand
  const picked = [...CERT_POOL].sort(() => rand() - 0.5).slice(0, count);
  const items = picked.map((name) => {
    const year = 2564 + Math.floor(rand() * 6);
    const monthIndex = Math.floor(rand() * 12);
    const day = 1 + Math.floor(rand() * 28);
    return {
      name,
      date: `${day} ${THAI_MONTHS[monthIndex]} ${year}`,
      organization: rand() > 0.3 ? "สภาเภสัชกรรม" : "ราชวิทยาลัยเภสัชกรรมฯ",
      /** sort key: newer first */
      _sort: year * 10000 + monthIndex * 100 + day,
    };
  });
  return items
    .sort((a, b) => b._sort - a._sort)
    .map(({ name, date, organization }) => ({ name, date, organization }));
}

/** 20 mock pharmacists named กิตติ for search testing (licenses 1–20 exact). */
export const mockPharmacistsList: PharmacistData[] = Array.from(
  { length: 20 },
  (_, i) => {
    const rand = seededRandom(1000 + i * 97);
    const n = i + 1;
    const isAbnormal = n % 5 === 0;
    const cpeIncomplete = n % 3 === 0;
    const province = PROVINCES[i % PROVINCES.length];
    const month = THAI_MONTHS[i % 12];
    const day = 5 + (i % 20);
    const year = 2568 + (i % 3);

    return {
      id: String(n),
      title: n % 2 === 0 ? "ภญ." : "ภก.",
      name: `กิตติ ${LAST_NAMES[i]}`,
      licenseNo: `ภ. ${n}`,
      statusType: isAbnormal ? "abnormal" : "normal",
      statusReason: isAbnormal
        ? ABNORMAL_REASONS[i % ABNORMAL_REASONS.length]
        : undefined,
      cpeStatus: cpeIncomplete ? "incomplete" : "complete",
      expiryDate: `${day} ${month} ${year}`,
      replacementInfo:
        n % 7 === 0 ? "(เคยขอใบแทน 1 ครั้ง)" : "(ไม่เคยขอใบแทน)",
      contactProvince: province.name,
      contactPostalCode: province.zip,
      image: n === 1 ? "/images/public/pharmacist-sample.png" : null,
      certificates: buildCertificates(rand),
    };
  }
);

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

export function getPharmacistById(id: string): PharmacistData | undefined {
  return mockPharmacistsList.find((item) => String(item.id) === String(id));
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


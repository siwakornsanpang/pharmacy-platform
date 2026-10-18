export type VerificationStatus = "verified" | "pending" | "rejected" | "draft";

export type Verification = {
  status: VerificationStatus;
  verifiedBy?: string;
};

export type LicenseStatus = "active" | "suspended" | "expired" | "pending";

export type CredentialType =
  | "certificate"
  | "approval_letter"
  | "board_cert";

export type AcademicKind =
  | "publication"
  | "research_project"
  | "speaker"
  | "award";

export type PharmacistPassport = {
  memberId: string;
  verifyToken: string;
  updatedAt: string;
  focusAreas: string[];
  issuingAuthority: {
    nameTh: string;
    nameEn: string;
    regulatorTh: string;
    regulatorEn: string;
    logoUrl: string;
  };
  identity: {
    titleTh: string;
    firstNameTh: string;
    lastNameTh: string;
    titleEn: string;
    firstNameEn: string;
    lastNameEn: string;
    photoUrl: string;
    dateOfBirth: string;
    citizenId: string;
    nationality: string;
    email: string;
  };
  license: {
    status: LicenseStatus;
    licenseNumber: string;
    renewalCycle: string;
    expiresAt: string;
  };
  qualifications: Array<{
    id: string;
    degreeTh: string;
    institution: string;
    field: string;
    graduationYear: number;
    gpa?: number;
    verification: Verification;
  }>;
  specializations: Array<{
    id: string;
    type: CredentialType;
    titleTh: string;
    specialtyTh: string;
    collegeShort: string;
    verification: Verification;
  }>;
  experience: Array<{
    id: string;
    position: string;
    organization: string;
    startYear: number;
    endYear?: number;
    isCurrent?: boolean;
    employmentType?: string;
    responsibilities?: string;
    verification: Verification;
  }>;
  academicWork: Array<{
    id: string;
    kind: AcademicKind;
    title: string;
    role?: string;
    venue?: string;
    year: number;
    verification: Verification;
  }>;
};

export const verificationLabels: Record<
  VerificationStatus,
  { th: string; tone: "ok" | "warn" | "danger" | "muted" }
> = {
  verified: { th: "ยืนยันแล้ว", tone: "ok" },
  pending: { th: "รอตรวจสอบ", tone: "warn" },
  rejected: { th: "ไม่ผ่าน", tone: "danger" },
  draft: { th: "ฉบับร่าง", tone: "muted" },
};

export const licenseStatusLabels: Record<
  LicenseStatus,
  { th: string; tone: "ok" | "warn" | "danger" | "muted" }
> = {
  active: { th: "ปกติ", tone: "ok" },
  suspended: { th: "พักใช้", tone: "warn" },
  expired: { th: "หมดอายุ", tone: "danger" },
  pending: { th: "รอดำเนินการ", tone: "muted" },
};

export const credentialTypeLabels: Record<CredentialType, string> = {
  certificate: "ประกาศนียบัตร",
  approval_letter: "หนังสืออนุมัติ",
  board_cert: "วุฒิบัตร",
};

const MOCK_PASSPORT: PharmacistPassport = {
  memberId: "PCT-2568-00421",
  verifyToken: "PCT-VFY-8K2M9Q",
  updatedAt: "2026-09-01",
  focusAreas: ["เภสัชกรรมคลินิก", "การใช้ยาอย่างสมเหตุผล", "การคุ้มครองผู้บริโภค"],
  issuingAuthority: {
    nameTh: "สภาเภสัชกรรม",
    nameEn: "The Pharmacy Council of Thailand",
    regulatorTh: "กระทรวงสาธารณสุข",
    regulatorEn: "Ministry of Public Health",
    logoUrl: "/images/public/icon.jpg",
  },
  identity: {
    titleTh: "ภก.",
    firstNameTh: "สมชาย",
    lastNameTh: "รักชาติ",
    titleEn: "Pharm.",
    firstNameEn: "Somchai",
    lastNameEn: "Rakchat",
    photoUrl: "/images/public/member/image.png",
    dateOfBirth: "1988-04-12",
    citizenId: "1103700123456",
    nationality: "ไทย",
    email: "somchai.r@example.com",
  },
  license: {
    status: "active",
    licenseNumber: "ภ.12345",
    renewalCycle: "รอบที่ 2 (2568–2573)",
    expiresAt: "2027-04-30",
  },
  qualifications: [
    {
      id: "q1",
      degreeTh: "เภสัชศาสตรบัณฑิต",
      institution: "จุฬาลงกรณ์มหาวิทยาลัย",
      field: "เภสัชศาสตร์",
      graduationYear: 2554,
      gpa: 3.42,
      verification: { status: "verified", verifiedBy: "สภาเภสัชกรรม" },
    },
    {
      id: "q2",
      degreeTh: "เภสัชศาสตรมหาบัณฑิต",
      institution: "มหาวิทยาลัยมหิดล",
      field: "เภสัชกรรมคลินิก",
      graduationYear: 2558,
      verification: { status: "verified", verifiedBy: "สภาเภสัชกรรม" },
    },
  ],
  specializations: [
    {
      id: "s1",
      type: "certificate",
      titleTh: "ประกาศนียบัตรเภสัชกรรมคลินิก",
      specialtyTh: "เภสัชกรรมคลินิก",
      collegeShort: "ราชวิทยาลัยเภสัชกรรมฯ",
      verification: { status: "verified", verifiedBy: "ราชวิทยาลัยเภสัชกรรมฯ" },
    },
    {
      id: "s2",
      type: "approval_letter",
      titleTh: "หนังสืออนุมัติผู้เชี่ยวชาญด้านเภสัชกรรมโรงพยาบาล",
      specialtyTh: "เภสัชกรรมโรงพยาบาล",
      collegeShort: "ราชวิทยาลัยเภสัชกรรมฯ",
      verification: { status: "pending" },
    },
  ],
  experience: [
    {
      id: "e1",
      position: "เภสัชกรชำนาญการ",
      organization: "สภาเภสัชกรรม กระทรวงสาธารณสุข",
      startYear: 2563,
      isCurrent: true,
      employmentType: "ประจำ",
      responsibilities: "กำกับมาตรฐานวิชาชีพ และสนับสนุนงานบริการสมาชิก",
      verification: { status: "verified", verifiedBy: "หน่วยงานต้นสังกัด" },
    },
    {
      id: "e2",
      position: "เภสัชกร",
      organization: "โรงพยาบาลศิริราช",
      startYear: 2555,
      endYear: 2562,
      employmentType: "ประจำ",
      verification: { status: "verified", verifiedBy: "หน่วยงานต้นสังกัด" },
    },
  ],
  academicWork: [
    {
      id: "a1",
      kind: "publication",
      title: "แนวทางการใช้ยาปฏิชีวนะอย่างสมเหตุผลในโรงพยาบาลชุมชน",
      role: "ผู้เขียนหลัก",
      venue: "Thai Journal of Pharmacy Practice",
      year: 2567,
      verification: { status: "verified", verifiedBy: "บรรณาธิการวารสาร" },
    },
    {
      id: "a2",
      kind: "speaker",
      title: "การคุ้มครองผู้บริโภคด้านยาในยุคดิจิทัล",
      role: "วิทยากร",
      venue: "การประชุมวิชาการสภาเภสัชกรรม",
      year: 2568,
      verification: { status: "verified", verifiedBy: "สภาเภสัชกรรม" },
    },
  ],
};

export function getCurrentPassportSync(): PharmacistPassport {
  return MOCK_PASSPORT;
}

export function fullNameTh(p: PharmacistPassport): string {
  const { titleTh, firstNameTh, lastNameTh } = p.identity;
  return `${titleTh} ${firstNameTh} ${lastNameTh}`.trim();
}

export function fullNameEn(p: PharmacistPassport): string {
  const { titleEn, firstNameEn, lastNameEn } = p.identity;
  return `${titleEn} ${firstNameEn} ${lastNameEn}`.trim();
}

export function ageFromDob(isoDate: string): number {
  const dob = new Date(isoDate);
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

export function maskCitizenId(id: string): string {
  const digits = id.replace(/\D/g, "");
  if (digits.length < 5) return id;
  return `${digits.slice(0, 1)}-****-*****-**-${digits.slice(-2)}`;
}

const THAI_MONTHS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

export function formatThaiDate(isoDate: string): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return `${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export function daysUntilLicenseExpiry(p: PharmacistPassport): number {
  const exp = new Date(p.license.expiresAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  exp.setHours(0, 0, 0, 0);
  return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function verifyUrl(token: string, origin = ""): string {
  const path = `/verify/${encodeURIComponent(token)}`;
  return origin ? `${origin}${path}` : path;
}

export function specializationsForDisplay(p: PharmacistPassport) {
  return p.specializations;
}

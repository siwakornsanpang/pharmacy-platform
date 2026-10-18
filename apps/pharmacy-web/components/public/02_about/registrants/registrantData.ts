export type RegistrantRow = {
  id: number;
  specialty: string;
  diploma: number | null;
  approval: number | null;
  professionalCert: number | null;
  certificate: number | null;
};

/** Static snapshot matching the published registrant report (mock until API exists). */
export const REGISTRANT_ROWS: RegistrantRow[] = [
  {
    id: 1,
    specialty: "สาขาเภสัชบำบัด",
    diploma: 130,
    approval: 41,
    professionalCert: 1310,
    certificate: null,
  },
  {
    id: 2,
    specialty: "สาขาการคุ้มครองผู้บริโภคด้านยาและสุขภาพ",
    diploma: null,
    approval: 140,
    professionalCert: 817,
    certificate: null,
  },
  {
    id: 3,
    specialty: "สาขาเภสัชกรรมสมุนไพร",
    diploma: null,
    approval: 32,
    professionalCert: 53,
    certificate: null,
  },
  {
    id: 4,
    specialty: "สาขาเภสัชกรรมอุตสาหการ",
    diploma: null,
    approval: 35,
    professionalCert: 96,
    certificate: null,
  },
  {
    id: 5,
    specialty: "สาขาเภสัชกรรมชุมชน",
    diploma: null,
    approval: 8,
    professionalCert: 9,
    certificate: null,
  },
  {
    id: 6,
    specialty: "สาขาการบริหารเภสัชกิจ",
    diploma: null,
    approval: 34,
    professionalCert: 108,
    certificate: null,
  },
  {
    id: 7,
    specialty: "สาขาเภสัชพันธุศาสตร์และเภสัชกรรมแม่นยำ",
    diploma: null,
    approval: null,
    professionalCert: 25,
    certificate: 164,
  },
  {
    id: 8,
    specialty:
      "การอบรมเพิ่มพูนสมรรถนะ ความรู้ ทักษะทางวิชาชีพเฉพาะเรื่อง",
    diploma: null,
    approval: null,
    professionalCert: null,
    certificate: 12589,
  },
];

export const REGISTRANT_NOTES = [
  "วุฒิบัตรแสดงความรู้ ความชำนาญในการประกอบวิชาชีพเภสัชกรรม สาขาความเชี่ยวชาญ",
  "หนังสืออนุมัติแสดงความรู้ ความชำนาญในการประกอบวิชาชีพเภสัชกรรม สาขาความเชี่ยวชาญ",
  "ประกาศนียบัตรวิชาชีพเภสัชกรรม : สำหรับผู้สำเร็จการฝึกอบรมหลักสูตรการฝึกอบรมระยะสั้น สาขาความเชี่ยวชาญ",
  "ประกาศนียบัตร : สำหรับผู้สำเร็จการอบรมหลักสูตรการอบรมเพิ่มพูนสมรรถนะ ความรู้ ทักษะทางวิชาชีพเฉพาะเรื่อง",
];

export function formatCount(value: number | null): string {
  if (value === null || value === undefined) return "-";
  return value.toLocaleString("th-TH");
}

export function sumColumn(
  rows: RegistrantRow[],
  key: keyof Pick<
    RegistrantRow,
    "diploma" | "approval" | "professionalCert" | "certificate"
  >
): number {
  return rows.reduce((sum, row) => sum + (row[key] ?? 0), 0);
}

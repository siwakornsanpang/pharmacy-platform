import { CourseRow, MOCK_COURSES } from "./mockData";

export const SAP33_SELECTED_COURSES_KEY = "eservice-sap-33-selected-courses";

export type Sap33SelectionPayload = {
  ids: string[];
  courses: CourseRow[];
  feePerItem: number;
  total: number;
};

export function saveSap33Selection(payload: Sap33SelectionPayload) {
  try {
    sessionStorage.setItem(SAP33_SELECTED_COURSES_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function loadSap33Selection(): Sap33SelectionPayload | null {
  try {
    const raw = sessionStorage.getItem(SAP33_SELECTED_COURSES_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Sap33SelectionPayload;
    if (!data?.ids?.length) return null;
    // Re-hydrate course rows from mock if needed
    const courses =
      data.courses?.length > 0
        ? data.courses
        : MOCK_COURSES.filter((c) => data.ids.includes(c.id));
    return { ...data, courses };
  } catch {
    return null;
  }
}

export type PaymentLine = {
  item: string;
  qty: number;
  price: number;
  kind?: "header" | "course" | "fee" | "shipping";
};

/** Build สภ.33 payment lines from selected courses (Figma S2-1) */
export function buildSap33PaymentLines(
  courses: CourseRow[],
  opts?: { includeShipping?: boolean }
): PaymentLine[] {
  const feePerItem = 500;
  const lines: PaymentLine[] = [
    {
      item: "สภ.33 คำขอประกาศนียบัตรวิชาชีพ",
      qty: 1,
      price: 0,
      kind: "header",
    },
    ...courses.map((c) => ({
      item: c.course,
      qty: 1,
      price: feePerItem,
      kind: "course" as const,
    })),
    { item: "ค่าธรรมเนียม", qty: 1, price: 20, kind: "fee" },
  ];
  if (opts?.includeShipping !== false) {
    lines.push({ item: "ค่าจัดส่ง", qty: 1, price: 50, kind: "shipping" });
  }
  return lines;
}

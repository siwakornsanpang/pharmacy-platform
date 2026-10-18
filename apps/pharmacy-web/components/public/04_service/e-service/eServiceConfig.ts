export type EServiceStepId =
  | "apply"
  | "apply-manual"
  | "payment"
  | "payment-status"
  | "detail"
  | "delivery"
  | "history";

/** Main wizard steps shown in the 4-step Figma stepper */
export type WizardStepId = "apply" | "payment" | "detail" | "delivery";

export type EServiceStep = {
  id: EServiceStepId;
  code: string;
  label: string;
  hrefSuffix: string;
  wizardIndex?: 1 | 2 | 3 | 4;
};

export type EServiceModule = {
  slug: string;
  formCode: string;
  title: string;
  shortTitle: string;
  description: string;
  serviceApiNames: string[];
  feeLabel: string;
  requestNo: string;
  steps: EServiceStep[];
};

function wizardSteps(slug: string): EServiceStep[] {
  return [
    {
      id: "apply",
      code: "01",
      label: "ยื่นคำขอ",
      hrefSuffix: `/service/e-service/${slug}/apply`,
      wizardIndex: 1,
    },
    {
      id: "payment",
      code: "02",
      label: "ชำระเงิน",
      hrefSuffix: `/service/e-service/${slug}/payment`,
      wizardIndex: 2,
    },
    {
      id: "detail",
      code: "03",
      label: "จัดเตรียมเอกสาร",
      hrefSuffix: `/service/e-service/${slug}/detail`,
      wizardIndex: 3,
    },
    {
      id: "delivery",
      code: "04",
      label: "จัดส่งเอกสาร",
      hrefSuffix: `/service/e-service/${slug}/delivery`,
      wizardIndex: 4,
    },
  ];
}

export const E_SERVICE_MODULES: EServiceModule[] = [
  {
    slug: "sap-33",
    formCode: "สภ.33",
    title: "สภ.33 คำขอประกาศนียบัตรวิชาชีพ",
    shortTitle: "ประกาศนียบัตร",
    description: "คำขอประกาศนียบัตรวิชาชีพเภสัชกรรม",
    serviceApiNames: ["ประกาศนียบัตร", "สภ.33"],
    feeLabel: "ค่าบริการตามจำนวนที่เลือก",
    requestNo: "2569/001",
    steps: [
      ...wizardSteps("sap-33"),
      {
        id: "payment-status",
        code: "S2-2",
        label: "สถานะชำระเงิน",
        hrefSuffix: `/service/e-service/sap-33/payment-status`,
      },
      {
        id: "history",
        code: "S5",
        label: "ประวัติการยื่นคำขอ",
        hrefSuffix: `/service/e-service/sap-33/history`,
      },
    ],
  },
  {
    slug: "sap-22",
    formCode: "สภ.22",
    title: "สภ.22 คำขอเปลี่ยนชื่อตัว ชื่อสกุล เพิ่มยศ หรือเพิ่มอภิไธย",
    shortTitle: "เปลี่ยนชื่อ / ยศ / อภิไธย",
    description: "คำขอเปลี่ยนชื่อตัว ชื่อสกุล เพิ่มยศ หรือเพิ่มอภิไธย",
    serviceApiNames: ["สภ.22"],
    feeLabel: "ค่าบริการ 500 บาท",
    requestNo: "2569/002",
    steps: [
      ...wizardSteps("sap-22"),
      {
        id: "apply-manual",
        code: "S1-M",
        label: "ยื่นคำขอ (Manual)",
        hrefSuffix: `/service/e-service/sap-22/apply-manual`,
        wizardIndex: 1,
      },
      {
        id: "payment-status",
        code: "S2-2",
        label: "สถานะชำระเงิน",
        hrefSuffix: `/service/e-service/sap-22/payment-status`,
      },
      {
        id: "history",
        code: "S5",
        label: "ประวัติการยื่นคำขอ",
        hrefSuffix: `/service/e-service/sap-22/history`,
      },
    ],
  },
];

export const WIZARD_STEPS: { id: WizardStepId; code: string; label: string }[] = [
  { id: "apply", code: "01", label: "ยื่นคำขอ" },
  { id: "payment", code: "02", label: "ชำระเงิน" },
  { id: "detail", code: "03", label: "จัดเตรียมเอกสาร" },
  { id: "delivery", code: "04", label: "จัดส่งเอกสาร" },
];

export function getEServiceModule(slug: string): EServiceModule | undefined {
  return E_SERVICE_MODULES.find((m) => m.slug === slug);
}

export function getWizardIndex(stepId?: EServiceStepId): number {
  if (!stepId) return 0;
  if (stepId === "apply" || stepId === "apply-manual") return 1;
  if (stepId === "payment" || stepId === "payment-status") return 2;
  if (stepId === "detail") return 3;
  if (stepId === "delivery") return 4;
  return 0;
}

export function resolveEServiceHref(
  serviceName?: string | null,
  shortName?: string | null
): string | null {
  const candidates = [shortName, serviceName].filter(Boolean) as string[];
  for (const mod of E_SERVICE_MODULES) {
    if (
      candidates.some((name) =>
        mod.serviceApiNames.some(
          (api) => api === name || name.includes(api) || api.includes(name)
        )
      )
    ) {
      // เข้า flow จริงทันที ไม่ผ่านหน้า hub เลือกหน้าจอ
      if (mod.slug === "sap-33") {
        return `/service/e-service/sap-33/apply`;
      }
      if (mod.slug === "sap-22") {
        return `/service/e-service/sap-22/apply`;
      }
      return `/service/e-service/${mod.slug}`;
    }
  }
  return null;
}

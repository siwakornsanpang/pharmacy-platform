export type CourseRow = {
  id: string;
  course: string;
  branch: string;
  batch: string;
  date: string;
};

export type HistoryRow = {
  id: string;
  requestNo: string;
  date: string;
  form: string;
  paymentStatus: string;
  paymentTone: "danger" | "success" | "warning" | "neutral" | "action";
  processStatus: string;
  processTone: "danger" | "success" | "warning" | "neutral";
  moduleSlug: "sap-33" | "sap-22";
};

export const MOCK_COURSES: CourseRow[] = [
  {
    id: "c1",
    course:
      "การอบรมระยะสั้นสำหรับผู้ประกอบวิชาชีพเภสัชกรรมด้าน Digital Health & AI Level 4",
    branch: "Digital Health & AI Level 4",
    batch: "11",
    date: "27 มี.ค 2569 - 28 มี.ค 2569",
  },
  {
    id: "c2",
    course: "ประกาศนียบัตรการบริบาลทางเภสัชกรรมชุมชน",
    branch: "-",
    batch: "-",
    date: "29 มี.ค 2569",
  },
  {
    id: "c3",
    course: "ประกาศนียบัตรวิชาชีพ",
    branch: "กัญชาทางการแพทย์พื้นฐานสำหรับเภสัชกร",
    batch: "101",
    date: "30 มี.ค 2569",
  },
  {
    id: "c4",
    course: "ประกาศนียบัตรวิชาชีพ",
    branch: "การสร้างเสริมภูมิคุ้มกันโรคโดยเภสัชกร",
    batch: "-",
    date: "31 มี.ค 2569",
  },
];

export const MOCK_HISTORY: HistoryRow[] = [
  {
    id: "1",
    requestNo: "2569/001",
    date: "27 มีนาคม 2569 01:00",
    form: "สภ.33 คำขอประกาศนียบัตรวิชาชีพ",
    paymentStatus: "ยังไม่ชำระเงิน",
    paymentTone: "danger",
    processStatus: "แบบร่างยื่นคำขอ",
    processTone: "neutral",
    moduleSlug: "sap-33",
  },
  {
    id: "2",
    requestNo: "2569/001",
    date: "27 มีนาคม 2569 01:00",
    form: "สภ.33 คำขอประกาศนียบัตรวิชาชีพ",
    paymentStatus: "ชำระเงิน",
    paymentTone: "action",
    processStatus: "รอการชำระเงิน",
    processTone: "warning",
    moduleSlug: "sap-33",
  },
  {
    id: "3",
    requestNo: "2569/001",
    date: "27 มีนาคม 2569 01:00",
    form: "สภ.33 คำขอประกาศนียบัตรวิชาชีพ",
    paymentStatus: "ชำระเงินแล้ว",
    paymentTone: "success",
    processStatus: "จัดส่งสำเร็จ",
    processTone: "success",
    moduleSlug: "sap-33",
  },
  {
    id: "4",
    requestNo: "2569/001",
    date: "27 มีนาคม 2569 01:00",
    form: "สภ.33 คำขอประกาศนียบัตรวิชาชีพ",
    paymentStatus: "ชำระเงินแล้ว",
    paymentTone: "success",
    processStatus: "กำลังจัดส่ง",
    processTone: "warning",
    moduleSlug: "sap-33",
  },
  {
    id: "5",
    requestNo: "2569/001",
    date: "27 มีนาคม 2569 01:00",
    form: "สภ.33 คำขอประกาศนียบัตรวิชาชีพ",
    paymentStatus: "ชำระเงินแล้ว",
    paymentTone: "success",
    processStatus: "รอตรวจสอบ",
    processTone: "warning",
    moduleSlug: "sap-33",
  },
  {
    id: "6",
    requestNo: "2569/001",
    date: "27 มีนาคม 2569 01:00",
    form: "สภ.33 คำขอประกาศนียบัตรวิชาชีพ",
    paymentStatus: "คืนเงินเรียบร้อย",
    paymentTone: "danger",
    processStatus: "ข้อมูลไม่ครบถ้วน",
    processTone: "danger",
    moduleSlug: "sap-33",
  },
  {
    id: "7",
    requestNo: "2569/001",
    date: "27 มีนาคม 2569 01:00",
    form: "สภ.33 คำขอประกาศนียบัตรวิชาชีพ",
    paymentStatus: "กำลังคืนเงิน",
    paymentTone: "warning",
    processStatus: "ยกเลิกคำขอ",
    processTone: "danger",
    moduleSlug: "sap-33",
  },
  {
    id: "8",
    requestNo: "2569/002",
    date: "27 มีนาคม 2569 02:10",
    form: "สภ.22 คำขอเปลี่ยนชื่อตัว ชื่อสกุล เพิ่มยศ หรือเพิ่มอภิไธย",
    paymentStatus: "ยกเลิก",
    paymentTone: "danger",
    processStatus: "ยกเลิกคำขอ",
    processTone: "danger",
    moduleSlug: "sap-22",
  },
  {
    id: "9",
    requestNo: "2569/002",
    date: "26 มีนาคม 2569 14:20",
    form: "สภ.22 คำขอเปลี่ยนชื่อตัว ชื่อสกุล เพิ่มยศ หรือเพิ่มอภิไธย",
    paymentStatus: "ชำระเงินแล้ว",
    paymentTone: "success",
    processStatus: "กำลังจัดเตรียมเอกสาร",
    processTone: "warning",
    moduleSlug: "sap-22",
  },
];

export const COUNCIL_ADDRESS = {
  title: "สำนักงานเลขาธิการสภาเภสัชกรรม",
  lines: [
    "อาคารมหิตลาธิเบศร ชั้น 8 กระทรวงสาธารณสุข",
    "เลขที่ 88/19 หมู่ 4 ถนนติวานนท์ ตำบลตลาดขวัญ",
    "อำเภอเมือง จังหวัดนนทบุรี 11000",
  ],
  phone: "02-591-9992",
};

export const USER_ADDRESS = {
  name: "คุณสมชาย รักชาติ",
  phone: "081-2154-161",
  lines: [
    "เลขที่ 123/12 หมู่บ้านแมวป่า ตรอก/ซอย 7 ถนนมิตรภาพ",
    "ตำบลปากช่อง อำเภอปากช่อง จังหวัดนครราชสีมา 30130",
  ],
};

export type SavedAddressTag = "default" | "home" | "work";

export type SavedAddress = {
  id: string;
  name: string;
  phone: string;
  line1: string;
  line2: string;
  tags: SavedAddressTag[];
  type: "home" | "work";
  firstName: string;
  lastName: string;
  houseNo: string;
  village: string;
  moo: string;
  soi: string;
  road: string;
  subdistrict: string;
  district: string;
  province: string;
  zip: string;
  isDefault: boolean;
};

export const MOCK_SAVED_ADDRESSES: SavedAddress[] = [
  {
    id: "a1",
    name: "คุณสมชาย รักชาติ",
    phone: "081-2154-161",
    line1: "เลขที่ 123/12 หมู่บ้าน/อาคาร หมู่บ้านแมวป่า ตรอก/ซอย 7 ถนน มิตรภาพ",
    line2: "ตำบล ปากช่อง อำเภอ ปากช่อง จังหวัด นครราชสีมา 30130",
    tags: ["default", "home"],
    type: "home",
    firstName: "สมชาย",
    lastName: "รักชาติ",
    houseNo: "123/12",
    village: "หมู่บ้านแมวป่า",
    moo: "-",
    soi: "7",
    road: "มิตรภาพ",
    subdistrict: "ปากช่อง",
    district: "ปากช่อง",
    province: "นครราชสีมา",
    zip: "30130",
    isDefault: true,
  },
  {
    id: "a2",
    name: "คุณสมชาย รักชาติ",
    phone: "081-2154-161",
    line1: "เลขที่ 123/12 หมู่บ้าน/อาคาร หมู่บ้านแมวป่า ตรอก/ซอย 7 ถนน มิตรภาพ",
    line2: "ตำบล ปากช่อง อำเภอ ปากช่อง จังหวัด นครราชสีมา 30130",
    tags: ["home"],
    type: "home",
    firstName: "สมชาย",
    lastName: "รักชาติ",
    houseNo: "123/12",
    village: "หมู่บ้านแมวป่า",
    moo: "-",
    soi: "7",
    road: "มิตรภาพ",
    subdistrict: "ปากช่อง",
    district: "ปากช่อง",
    province: "นครราชสีมา",
    zip: "30130",
    isDefault: false,
  },
  {
    id: "a3",
    name: "คุณสมชาย รักชาติ",
    phone: "081-2154-161",
    line1: "เลขที่ 88/19 อาคารมหิตลาธิเบศร ชั้น 8 ถนนติวานนท์",
    line2: "ตำบลตลาดขวัญ อำเภอเมือง จังหวัดนนทบุรี 11000",
    tags: ["work"],
    type: "work",
    firstName: "สมชาย",
    lastName: "รักชาติ",
    houseNo: "88/19",
    village: "อาคารมหิตลาธิเบศร",
    moo: "-",
    soi: "-",
    road: "ติวานนท์",
    subdistrict: "ตลาดขวัญ",
    district: "เมือง",
    province: "นนทบุรี",
    zip: "11000",
    isDefault: false,
  },
];

export type ReceiptAddressFields = {
  houseNo: string;
  village: string;
  moo: string;
  soi: string;
  road: string;
  subdistrict: string;
  district: string;
  province: string;
  zip: string;
};

export type PharmacistReceiptInfo = ReceiptAddressFields & {
  firstName: string;
  lastName: string;
  phone: string;
  taxId: string;
};

export type JuristicReceiptInfo = ReceiptAddressFields & {
  companyName: string;
  taxId: string;
  contactFirstName: string;
  contactLastName: string;
  phone: string;
};

export function formatReceiptAddressLines(a: ReceiptAddressFields) {
  return {
    line1: `เลขที่ ${a.houseNo} หมู่บ้าน/อาคาร ${a.village} ตรอก/ซอย ${a.soi} ถนน ${a.road}`,
    line2: `ตำบล ${a.subdistrict} อำเภอ ${a.district} จังหวัด ${a.province} ${a.zip}`,
  };
}

const DEFAULT_RECEIPT_ADDRESS: ReceiptAddressFields = {
  houseNo: "123/12",
  village: "หมู่บ้านแมวป่า",
  moo: "-",
  soi: "7",
  road: "มิตรภาพ",
  subdistrict: "ปากช่อง",
  district: "ปากช่อง",
  province: "นครราชสีมา",
  zip: "30130",
};

export const MOCK_PHARMACIST_RECEIPT: PharmacistReceiptInfo = {
  firstName: "สมชาย",
  lastName: "รักชาติ",
  phone: "081-2154-161",
  taxId: "12231243142",
  ...DEFAULT_RECEIPT_ADDRESS,
};

export const MOCK_JURISTIC_RECEIPT: JuristicReceiptInfo = {
  companyName: "บริษัท ตัวอย่าง จำกัด",
  taxId: "12231243142",
  contactFirstName: "สมชาย",
  contactLastName: "รักชาติ",
  phone: "044-2141-124",
  ...DEFAULT_RECEIPT_ADDRESS,
};

export function paymentLines(moduleSlug: string) {
  if (moduleSlug === "sap-33") {
    return [
      { item: "สภ.33 คำขอประกาศนียบัตรวิชาชีพ", qty: 4, price: 2000 },
      { item: "ค่าธรรมเนียม", qty: 1, price: 20 },
      { item: "ค่าจัดส่ง", qty: 1, price: 50 },
    ];
  }
  return [
    {
      item: "สภ.22 คำขอเปลี่ยนชื่อตัว ชื่อสกุล เพิ่มยศ หรือเพิ่มอภิไธย",
      qty: 1,
      price: 500,
    },
    { item: "ค่าธรรมเนียม", qty: 1, price: 20 },
    { item: "ค่าจัดส่ง", qty: 1, price: 50 },
  ];
}

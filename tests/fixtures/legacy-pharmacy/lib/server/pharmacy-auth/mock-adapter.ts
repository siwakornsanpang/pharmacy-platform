import type { PharmacyAuthAdapter, VerifiedPharmacyIdentity } from "./adapter";

const MOCK_PASSWORD = "12345";

const MOCK_IDENTITIES: VerifiedPharmacyIdentity[] = [
  {
    provider: "pharmacy-council",
    subject: "mock-user-ph123",
    pharmacistLicense: "ภ12345",
    firstName: "สมชาย",
    lastName: "รักชาติ",
    email: "somchai@example.test",
    phone: "0800000440",
  },
  {
    provider: "pharmacy-council",
    subject: "mock-user-11111",
    pharmacistLicense: "11111",
    firstName: "กิตติศักดิ์",
    lastName: "วัฒนานนท์",
    email: "kittisak@example.test",
    phone: "0800000441",
  },
  {
    provider: "pharmacy-council",
    subject: "mock-user-22222",
    pharmacistLicense: "22222",
    firstName: "พิมพ์ชนก",
    lastName: "วงศ์ไพบูลย์",
    email: "pimchanok@example.test",
    phone: "0800000442",
  },
  {
    provider: "pharmacy-council",
    subject: "mock-user-33333",
    pharmacistLicense: "33333",
    firstName: "ณัฐวุฒิ",
    lastName: "ศรีสวัสดิ์",
    email: "nattawut@example.test",
    phone: "0800000443",
  },
  {
    provider: "pharmacy-council",
    subject: "mock-user-44444",
    pharmacistLicense: "44444",
    firstName: "ชลธิชา",
    lastName: "บุญเรือง",
    email: "chonthicha@example.test",
    phone: "0800000444",
  },
  {
    provider: "pharmacy-council",
    subject: "mock-user-55555",
    pharmacistLicense: "55555",
    firstName: "ธนกร",
    lastName: "เกียรติไพบูลย์",
    email: "thanakorn@example.test",
    phone: "0800000445",
  },
  {
    provider: "pharmacy-council",
    subject: "mock-user-66666",
    pharmacistLicense: "66666",
    firstName: "อรทัย",
    lastName: "สุขเกษม",
    email: "orathai@example.test",
    phone: "0800000446",
  },
  {
    provider: "pharmacy-council",
    subject: "mock-user-77777",
    pharmacistLicense: "77777",
    firstName: "ศุภกร",
    lastName: "อินทรา",
    email: "supakorn@example.test",
    phone: "0800000447",
  },
  {
    provider: "pharmacy-council",
    subject: "mock-user-88888",
    pharmacistLicense: "88888",
    firstName: "วิภาดา",
    lastName: "แสงทอง",
    email: "wipada@example.test",
    phone: "0800000448",
  },
  {
    provider: "pharmacy-council",
    subject: "mock-user-99999",
    pharmacistLicense: "99999",
    firstName: "ปกรณ์",
    lastName: "วัฒนกุล",
    email: "pakorn@example.test",
    phone: "0800000449",
  },
  {
    provider: "pharmacy-council",
    subject: "mock-user-00000",
    pharmacistLicense: "00000",
    firstName: "กมลชนก",
    lastName: "ใจดี",
    email: "kamonchanok@example.test",
    phone: "0800000450",
  },
];

export const mockPharmacyAdapter: PharmacyAuthAdapter = {
  async authenticate(license, password) {
    const input = license.trim();
    const identity =
      MOCK_IDENTITIES.find((item) => item.pharmacistLicense === input) ??
      (input.toLowerCase() === "ph123" ? MOCK_IDENTITIES[0] : undefined);
    return identity && password === MOCK_PASSWORD ? identity : null;
  },
  async verifyOtp(_identity, otp) {
    return otp === "111222";
  },
};

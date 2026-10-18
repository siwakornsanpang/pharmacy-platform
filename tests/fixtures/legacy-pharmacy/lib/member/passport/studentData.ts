export const studentDetailData = {
  program: "หลักสูตรฝึกอบรมผู้เชี่ยวชาญสาขาเภสัชกรรมคลินิก",
  college: "ราชวิทยาลัยเภสัชกรรมแห่งประเทศไทย",
  creditsEarned: 24,
  creditsTotal: 48,
};

export const registrationData = {
  courses: [
    {
      code: "CLN6101",
      title: "เภสัชกรรมคลินิกขั้นสูง 1",
      schedule: "จ–ศ 09:00–12:00",
    },
    {
      code: "CLN6102",
      title: "การใช้ยาอย่างสมเหตุผลในผู้ป่วยนอก",
      schedule: "อ 13:00–16:00",
    },
    {
      code: "CLN6201",
      title: "การฝึกปฏิบัติงานโรงพยาบาล",
      schedule: "ตามตารางสถาบันฝึกอบรม",
    },
  ],
};

export function formatCourseCode(code: string): string {
  if (code.length <= 4) return code;
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

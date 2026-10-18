/**
 * Local UI bypass — ใช้ดูงานบน localhost โดยไม่ต้องมี API
 * เปิดด้วย NEXT_PUBLIC_LOCAL_UI_BYPASS=1 ใน `.env.local` เท่านั้น
 * (ไฟล์ .env* ถูก gitignore แล้ว → ไม่กระทบ deploy)
 */
export function isLocalUiBypass(): boolean {
  const flag = process.env.NEXT_PUBLIC_LOCAL_UI_BYPASS;
  return flag === "1" || flag === "true";
}

export const LOCAL_UI_USER = {
  token: "local-ui-dev-token",
  role: "admin",
  displayName: "Local UI",
  id: "0",
} as const;

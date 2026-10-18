import { Check } from "lucide-react";
import styles from "./checkout-flow.module.css";

const steps = [
  { id: "checkout", label: "ตรวจสอบสิทธิ์" },
  { id: "payment", label: "ชำระเงิน" },
  { id: "success", label: "เสร็จสิ้น" },
] as const;

export function CheckoutProgress({ current, free = false }: { current: "checkout" | "payment" | "success"; free?: boolean }) {
  const activeIndex = steps.findIndex((step) => step.id === current);
  return <ol className={styles.progress} aria-label="ขั้นตอนการลงทะเบียน">
    {steps.map((step, index) => {
      const done = index < activeIndex || (free && step.id === "payment" && current === "success");
      const active = step.id === current;
      return <li key={step.id} className={`${styles.progressStep} ${done ? styles.progressDone : ""} ${active ? styles.progressActive : ""}`}>
        <span className={styles.progressMarker}>{done ? <Check size={15} /> : index + 1}</span>
        <span>{step.label}{free && step.id === "payment" ? " (ไม่เสียค่าใช้จ่าย)" : ""}</span>
      </li>;
    })}
  </ol>;
}

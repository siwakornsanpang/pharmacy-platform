"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Hourglass, XCircle } from "lucide-react";
import { EServiceModule } from "../eServiceConfig";
import EServiceShell from "../EServiceShell";
import styles from "../EServiceShell.module.css";

type StatusKind = "loading" | "success" | "fail-card" | "fail-timeout";

/**
 * Figma S2-2:
 * ตรวจสอบชำระเงิน / สำเร็จ / ไม่พบบัตรเครดิต / QR หมดเวลา
 */
export default function PaymentStatusPage({
  module,
  initialStatus = "loading",
}: {
  module: EServiceModule;
  initialStatus?: StatusKind;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<StatusKind>(initialStatus);

  useEffect(() => {
    if (status !== "loading") return;
    const t = setTimeout(() => setStatus("success"), 1800);
    return () => clearTimeout(t);
  }, [status]);

  useEffect(() => {
    if (status !== "success") return;
    const t = setTimeout(() => {
      router.push(`/service/e-service/${module.slug}/detail`);
    }, 1600);
    return () => clearTimeout(t);
  }, [status, module.slug, router]);

  return (
    <>
      <EServiceShell
        module={module}
        activeStep="payment-status"
        requestNo={module.requestNo}
        breadcrumbs={[
          { label: "หน้าแรก", href: "/home" },
          { label: "งานบริการ", href: "/service" },
          { label: module.shortTitle },
        ]}
        footerMeta={{ title: module.title, subtitle: module.feeLabel }}
        footerActions={[
          {
            label: "กลับไปชำระเงิน",
            href: `/service/e-service/${module.slug}/payment`,
            variant: "ghost",
          },
        ]}
      >
        <div className={`${styles.variantBar} ThaiFont`}>
          <span className={styles.muted}>ตัวอย่างตาม Figma S2-2:</span>
          <button type="button" className={`${styles.choice} ${status === "loading" ? styles.choiceActive : ""}`} onClick={() => setStatus("loading")}>ตรวจสอบชำระเงิน</button>
          <button type="button" className={`${styles.choice} ${status === "success" ? styles.choiceActive : ""}`} onClick={() => setStatus("success")}>สำเร็จ</button>
          <button type="button" className={`${styles.choice} ${status === "fail-card" ? styles.choiceActive : ""}`} onClick={() => setStatus("fail-card")}>ไม่พบบัตรเครดิต</button>
          <button type="button" className={`${styles.choice} ${status === "fail-timeout" ? styles.choiceActive : ""}`} onClick={() => setStatus("fail-timeout")}>QR หมดเวลา</button>
        </div>

        <section className={styles.card}>
          <div className={`${styles.statusHero} ThaiFont`}>
            {status === "loading" && (
              <>
                <Hourglass size={48} color="#c47a12" />
                <h2>กำลังตรวจสอบการชำระเงิน</h2>
                <p className={styles.muted}>กรุณารอสักครู่</p>
              </>
            )}
            {status === "success" && (
              <>
                <CheckCircle2 size={48} color="#3d6b1f" />
                <h2>ชำระเงินเรียบร้อย</h2>
                <p className={styles.muted}>ระบบจะนำท่านเข้าสู่หน้าสถานะโดยอัตโนมัติ</p>
              </>
            )}
            {status === "fail-card" && (
              <>
                <XCircle size={48} color="#c0392b" />
                <h2>ชำระเงินไม่สำเร็จ</h2>
                <p className={styles.muted}>ไม่พบบัตรเครดิต กรุณาลองใหม่อีกครั้ง</p>
                <button
                  type="button"
                  className={`${styles.btnPrimary} ThaiFont`}
                  style={{ marginTop: "1rem" }}
                  onClick={() => router.push(`/service/e-service/${module.slug}/payment`)}
                >
                  กลับไปชำระเงิน
                </button>
              </>
            )}
            {status === "fail-timeout" && (
              <>
                <XCircle size={48} color="#c0392b" />
                <h2>ชำระเงินไม่สำเร็จ</h2>
                <p className={styles.muted}>QR PromptPay หมดเวลา กรุณาสร้างรายการใหม่</p>
                <button
                  type="button"
                  className={`${styles.btnPrimary} ThaiFont`}
                  style={{ marginTop: "1rem" }}
                  onClick={() => router.push(`/service/e-service/${module.slug}/payment`)}
                >
                  สร้าง QR ใหม่
                </button>
              </>
            )}
          </div>
        </section>
      </EServiceShell>

      {status === "loading" && (
        <div className={styles.overlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <Hourglass size={42} color="#c47a12" />
            <h2 className={`${styles.modalTitle} ThaiFont`}>กำลังตรวจสอบการชำระเงิน</h2>
            <p className={`${styles.modalDesc} ThaiFont`}>กรุณารอสักครู่</p>
          </div>
        </div>
      )}
    </>
  );
}

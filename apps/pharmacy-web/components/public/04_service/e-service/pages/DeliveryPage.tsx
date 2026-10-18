"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, MapPin, Receipt, Wallet } from "lucide-react";
import { EServiceModule } from "../eServiceConfig";
import EServiceShell from "../EServiceShell";
import {
  COUNCIL_ADDRESS,
  MOCK_COURSES,
  MOCK_SAVED_ADDRESSES,
  paymentLines,
} from "../mockData";
import { loadSap33Selection } from "../selectionStorage";
import { ToastBanner } from "../modals";
import styles from "../EServiceShell.module.css";

/** Figma S4: จัดส่งสำเร็จ + EMS */
export default function DeliveryPage({
  module,
  state = "success",
}: {
  module: EServiceModule;
  state?: "pickup" | "shipping" | "success";
}) {
  const [toast, setToast] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<string[]>(() =>
    module.slug === "sap-33"
      ? [module.title, ...MOCK_COURSES.slice(0, 4).map((c) => c.course)]
      : [module.title]
  );

  useEffect(() => {
    if (module.slug !== "sap-33") return;
    const selection = loadSap33Selection();
    if (selection?.courses?.length) {
      setOrderItems([module.title, ...selection.courses.map((c) => c.course)]);
    }
  }, [module.slug, module.title]);

  const payTotal = useMemo(() => {
    if (module.slug === "sap-33") {
      const courses = Math.max(0, orderItems.length - 1);
      return courses * 500 + 20 + 50;
    }
    return paymentLines(module.slug).reduce((sum, row) => sum + row.price, 0);
  }, [module.slug, orderItems.length]);

  const shipToCouncil = state === "pickup" || state === "success";
  const addressName = shipToCouncil
    ? COUNCIL_ADDRESS.title
    : (MOCK_SAVED_ADDRESSES.find((a) => a.isDefault) ?? MOCK_SAVED_ADDRESSES[0]).name;
  const addressPhone = shipToCouncil
    ? COUNCIL_ADDRESS.phone
    : (MOCK_SAVED_ADDRESSES.find((a) => a.isDefault) ?? MOCK_SAVED_ADDRESSES[0]).phone;
  const addressLines = shipToCouncil
    ? COUNCIL_ADDRESS.lines
    : [
        (MOCK_SAVED_ADDRESSES.find((a) => a.isDefault) ?? MOCK_SAVED_ADDRESSES[0]).line1,
        (MOCK_SAVED_ADDRESSES.find((a) => a.isDefault) ?? MOCK_SAVED_ADDRESSES[0]).line2,
      ];

  const statusLabel =
    state === "pickup"
      ? "พร้อมรับที่สภา"
      : state === "shipping"
        ? "อยู่ระหว่างจัดส่ง"
        : "จัดส่งสำเร็จ";

  return (
    <>
      <EServiceShell
        module={module}
        activeStep="delivery"
        requestNo={module.requestNo}
        breadcrumbs={[
          { label: "หน้าแรก", href: "/home" },
          { label: "งานบริการ", href: "/service" },
          {
            label: "ประวัติการยื่นคำขอ",
            href: `/service/e-service/${module.slug}/history`,
          },
          { label: `หมายเลขคำขอ ${module.requestNo}` },
        ]}
        footerMeta={{ title: module.title }}
        footerActions={[
          {
            label: "กลับไปหน้าประวัติ",
            href: `/service/e-service/${module.slug}/history`,
            variant: "ghost",
          },
        ]}
      >
        <div className={`${styles.deliveryStatusBlock} ThaiFont`}>
          <div className={styles.deliveryStatusTitle}>
            <CheckCircle2 size={22} color="#3d6b1f" />
            {statusLabel}
          </div>
          {state !== "pickup" && (
            <>
              <div className={styles.emsRow}>
                <span>หมายเลข EMS : 124-2-13245-1</span>
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText("124-2-13245-1");
                      setToast("คัดลอกหมายเลข EMS แล้ว");
                    } catch {
                      setToast("คัดลอกหมายเลข EMS แล้ว");
                    }
                  }}
                >
                  <Copy size={14} /> คัดลอก
                </button>
              </div>
              <button type="button" className={`${styles.btnGhost} ThaiFont`}>
                ติดตามสถานะ
              </button>
            </>
          )}
          {state === "pickup" && (
            <p className={styles.muted} style={{ margin: "0.5rem 0 0" }}>
              เอกสารพร้อมให้รับที่สำนักงานเลขาธิการสภาเภสัชกรรม
            </p>
          )}
        </div>

        <section className={styles.card}>
          <h2 className={`${styles.cardTitle} ThaiFont`}>
            <Receipt size={18} color="#686804" /> หมายเลขคำขอ {module.requestNo}
          </h2>
          <div className={styles.tableWrap} style={{ marginTop: "0.75rem" }}>
            <table className={styles.table}>
              <thead>
                <tr className="ThaiFont">
                  <th>รายการ</th>
                  <th style={{ width: 100, textAlign: "center" }}>จำนวน</th>
                </tr>
              </thead>
              <tbody>
                {orderItems.map((item) => (
                  <tr key={item} className="ThaiFont">
                    <td>{item}</td>
                    <td style={{ textAlign: "center" }}>1</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={`${styles.cardTitle} ThaiFont`}>
            <MapPin size={18} color="#686804" /> ที่อยู่จัดส่ง
          </h2>
          <div className={`${styles.infoBox} ThaiFont`} style={{ marginTop: "0.75rem" }}>
            <strong>
              {addressName} | {addressPhone}
            </strong>
            {addressLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </section>

        <section className={styles.card}>
          <h2 className={`${styles.cardTitle} ThaiFont`}>
            <Wallet size={18} color="#686804" /> ข้อมูลชำระเงิน
          </h2>
          <div className={`${styles.infoBox} ThaiFont`} style={{ marginTop: "0.75rem" }}>
            <div>ยอดชำระเงิน : {payTotal.toLocaleString("th-TH")} บาท</div>
            <div>ช่องทางชำระเงิน : QR Prompt Pay</div>
            <div>เวลาชำระเงิน : 04-01-2026 16:00</div>
          </div>
        </section>
      </EServiceShell>

      {toast && <ToastBanner message={toast} onDone={() => setToast(null)} />}
    </>
  );
}

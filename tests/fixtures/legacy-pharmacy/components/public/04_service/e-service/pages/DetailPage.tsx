"use client";

import { useEffect, useMemo, useState } from "react";
import { Hourglass, MapPin, Pencil, Receipt, Wallet, XCircle } from "lucide-react";
import { EServiceModule } from "../eServiceConfig";
import EServiceShell from "../EServiceShell";
import {
  MOCK_COURSES,
  MOCK_SAVED_ADDRESSES,
  USER_ADDRESS,
  paymentLines,
} from "../mockData";
import { loadSap33Selection } from "../selectionStorage";
import { AddressEditModal, ToastBanner } from "../modals";
import styles from "../EServiceShell.module.css";

type DetailState = "preparing" | "edit-saved" | "edit-cancel" | "rejected" | "refund";

/**
 * Figma S3: กำลังจัดเตรียมเอกสาร
 */
export default function DetailPage({
  module,
  initialState = "preparing",
}: {
  module: EServiceModule;
  initialState?: DetailState;
}) {
  const [state, setState] = useState<DetailState>(initialState);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [addressName, setAddressName] = useState(USER_ADDRESS.name);
  const [addressPhone, setAddressPhone] = useState(USER_ADDRESS.phone);
  const [addressLines, setAddressLines] = useState(USER_ADDRESS.lines);
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
    const def = MOCK_SAVED_ADDRESSES.find((a) => a.isDefault) ?? MOCK_SAVED_ADDRESSES[0];
    if (def) {
      setAddressName(def.name);
      setAddressPhone(def.phone);
      setAddressLines([def.line1, def.line2]);
    }
  }, [module.slug, module.title]);

  const payTotal = useMemo(() => {
    if (module.slug === "sap-33") {
      const courses = Math.max(0, orderItems.length - 1);
      return courses * 500 + 20 + 50;
    }
    return paymentLines(module.slug).reduce((sum, row) => sum + row.price, 0);
  }, [module.slug, orderItems.length]);

  const statusBanner =
    state === "rejected" || state === "refund" ? (
      <div className={`${styles.statusBanner} ThaiFont`} style={{ color: "#c0392b" }}>
        <XCircle size={18} />
        {state === "refund" ? "สถานะ - ไม่ผ่าน คืนเงิน" : "สถานะ - ไม่ผ่าน"}
      </div>
    ) : (
      <div className={`${styles.statusBanner} ThaiFont`}>
        <Hourglass size={18} color="#c47a12" />
        กำลังจัดเตรียมเอกสาร ใช้เวลาดำเนินการ 2-3 วัน
      </div>
    );

  return (
    <>
      <EServiceShell
        module={module}
        activeStep="detail"
        requestNo={module.requestNo}
        breadcrumbs={[
          { label: "หน้าแรก", href: "/home" },
          { label: "งานบริการ", href: "/service" },
          { label: "ประวัติการยื่นคำขอ", href: `/service/e-service/${module.slug}/history` },
          { label: `หมายเลขคำขอ ${module.requestNo}` },
        ]}
        footerMeta={{ title: module.title }}
        footerActions={[
          {
            label: "กลับไปหน้าประวัติ",
            href: `/service/e-service/${module.slug}/history`,
            variant: "ghost",
          },
          {
            label: "ตัวอย่างหน้า สถานะจัดส่ง",
            href: `/service/e-service/${module.slug}/delivery?state=success`,
            variant: "outline",
          },
        ]}
      >
        {statusBanner}

        {(state === "rejected" || state === "refund") && (
          <div className={`${styles.warningBox} ThaiFont`} style={{ marginBottom: "1rem" }}>
            {state === "refund"
              ? "คำขอไม่ผ่านและอยู่ระหว่างคืนเงิน — หากที่อยู่ผิดพลาดอาจแก้ไขได้บางกรณี"
              : "คำขอไม่ผ่านเนื่องจากเอกสาร/ข้อมูลไม่ครบ กรุณาตรวจสอบหมายเหตุจากเจ้าหน้าที่"}
          </div>
        )}

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
          <div className={styles.cardHead}>
            <h2 className={`${styles.cardTitle} ThaiFont`}>
              <MapPin size={18} color="#686804" /> ที่อยู่จัดส่ง
            </h2>
            <button
              type="button"
              className={`${styles.linkBtn} ThaiFont`}
              onClick={() => setEditing(true)}
            >
              <Pencil size={14} /> เปลี่ยนที่อยู่
            </button>
          </div>
          <div className={`${styles.infoBox} ThaiFont`}>
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
          <div className={`${styles.infoBox} ThaiFont`}>
            <div>
              ยอดชำระเงิน : {payTotal.toLocaleString("th-TH")} บาท
            </div>
            <div>ช่องทางชำระเงิน : QR Prompt Pay</div>
            <div>เวลาชำระเงิน : 04-01-2026 16:00</div>
            {state === "refund" && <div>สถานะคืนเงิน : กำลังคืนเงิน</div>}
          </div>
        </section>
      </EServiceShell>

      {editing && (
        <AddressEditModal
          onClose={() => {
            setEditing(false);
            setState("edit-cancel");
            setToast("แก้ไขที่อยู่จัดส่ง - ไม่ได้บันทึก");
          }}
          onSave={() => {
            setAddressLines(["ที่อยู่จัดส่งที่บันทึกใหม่แล้ว"]);
            setEditing(false);
            setState("edit-saved");
            setToast("แก้ไขที่อยู่จัดส่ง - บันทึกสำเร็จ");
          }}
        />
      )}
      {toast && (
        <ToastBanner
          message={toast}
          tone={state === "edit-cancel" ? "warning" : "success"}
          onDone={() => setToast(null)}
        />
      )}
    </>
  );
}

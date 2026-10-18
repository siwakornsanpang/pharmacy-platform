"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Hourglass,
  MapPin,
  Pencil,
  QrCode,
  Receipt,
  UserRound,
} from "lucide-react";
import { EServiceModule } from "../eServiceConfig";
import EServiceShell from "../EServiceShell";
import {
  COUNCIL_ADDRESS,
  MOCK_JURISTIC_RECEIPT,
  MOCK_PHARMACIST_RECEIPT,
  MOCK_SAVED_ADDRESSES,
  type SavedAddress,
  formatReceiptAddressLines,
  paymentLines,
} from "../mockData";
import {
  buildSap33PaymentLines,
  loadSap33Selection,
  type PaymentLine,
} from "../selectionStorage";
import {
  ContactAddressEditModal,
  ReceiptEditModal,
  ReceiptPreviewModal,
  SavedAddressesModal,
  ToastBanner,
} from "../modals";
import styles from "../EServiceShell.module.css";

type ShipMode = "council" | "mine";
type PayPhase = "form" | "qr" | "checking" | "success";

function formatMmSs(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/**
 * Figma S2-1 → QR → loading → success → S3 detail
 */
export default function PaymentPage({ module }: { module: EServiceModule }) {
  const router = useRouter();
  const [shipMode, setShipMode] = useState<ShipMode>("council");
  const [receiptMode, setReceiptMode] = useState<"pharmacist" | "juristic">(
    "pharmacist"
  );
  const [payPhase, setPayPhase] = useState<PayPhase>("form");
  const [qrSeconds, setQrSeconds] = useState(14 * 60 + 59);
  const [showSavedAddresses, setShowSavedAddresses] = useState(false);
  const [editingContact, setEditingContact] = useState<SavedAddress | null>(null);
  const [editingReceipt, setEditingReceipt] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>(MOCK_SAVED_ADDRESSES);
  const [selectedAddressId, setSelectedAddressId] = useState(
    MOCK_SAVED_ADDRESSES.find((a) => a.isDefault)?.id ?? MOCK_SAVED_ADDRESSES[0].id
  );
  const [pharmacistReceipt, setPharmacistReceipt] = useState(MOCK_PHARMACIST_RECEIPT);
  const [juristicReceipt, setJuristicReceipt] = useState(MOCK_JURISTIC_RECEIPT);
  const [sap33Lines, setSap33Lines] = useState<PaymentLine[] | null>(null);

  const selectedAddress =
    addresses.find((a) => a.id === selectedAddressId) ?? addresses[0];

  const pharmacistLines = formatReceiptAddressLines(pharmacistReceipt);
  const juristicLines = formatReceiptAddressLines(juristicReceipt);

  useEffect(() => {
    if (module.slug !== "sap-33") return;
    const selection = loadSap33Selection();
    if (selection?.courses?.length) {
      setSap33Lines(
        buildSap33PaymentLines(selection.courses, { includeShipping: true })
      );
    } else {
      setSap33Lines(null);
    }
  }, [module.slug]);

  /** QR แสดง 5 วิ แล้วเข้า loading */
  useEffect(() => {
    if (payPhase !== "qr") return;
    setQrSeconds(14 * 60 + 59);
    const tick = window.setInterval(() => {
      setQrSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    const toCheck = window.setTimeout(() => setPayPhase("checking"), 5000);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(toCheck);
    };
  }, [payPhase]);

  /** loading → success */
  useEffect(() => {
    if (payPhase !== "checking") return;
    const t = window.setTimeout(() => setPayPhase("success"), 1800);
    return () => window.clearTimeout(t);
  }, [payPhase]);

  /** success → จัดเตรียมเอกสาร */
  useEffect(() => {
    if (payPhase !== "success") return;
    const t = window.setTimeout(() => {
      router.push(`/service/e-service/${module.slug}/detail`);
    }, 1600);
    return () => window.clearTimeout(t);
  }, [payPhase, module.slug, router]);

  const lines: PaymentLine[] = useMemo(() => {
    if (module.slug === "sap-33") {
      const base =
        sap33Lines ??
        buildSap33PaymentLines([], { includeShipping: shipMode === "mine" });
      if (shipMode === "council") {
        return base.filter((row) => row.kind !== "shipping");
      }
      if (!base.some((r) => r.kind === "shipping")) {
        return [
          ...base,
          { item: "ค่าจัดส่ง", qty: 1, price: 50, kind: "shipping" },
        ];
      }
      return base;
    }
    const base = paymentLines(module.slug).map((row) => ({
      ...row,
      kind:
        row.item === "ค่าธรรมเนียม"
          ? ("fee" as const)
          : row.item === "ค่าจัดส่ง"
            ? ("shipping" as const)
            : ("header" as const),
    }));
    if (shipMode === "council") {
      return base.filter((row) => row.kind !== "shipping");
    }
    return base;
  }, [module.slug, sap33Lines, shipMode]);

  const total = lines.reduce((sum, row) => sum + row.price, 0);
  const courseCount = lines.filter((l) => l.kind === "course").length;

  const startPayment = () => {
    if (payPhase === "form") setPayPhase("qr");
  };

  return (
    <>
      <EServiceShell
        module={module}
        activeStep="payment"
        requestNo={module.requestNo}
        breadcrumbs={[
          { label: "หน้าแรก", href: "/home" },
          { label: "งานบริการ", href: "/service" },
          { label: module.slug === "sap-33" ? "ประกาศนียบัตร" : module.formCode },
        ]}
        footerMeta={{ title: module.title }}
        footerActions={[
          {
            label: "บันทึกแบบร่าง",
            variant: "ghost",
            onClick: () => setToast("บันทึกแบบร่างสำเร็จ"),
            disabled: payPhase === "checking" || payPhase === "success",
          },
          {
            label: "ชำระเงิน",
            onClick: startPayment,
            variant: "primary",
            disabled: payPhase !== "form",
          },
        ]}
      >
        {payPhase !== "form" ? (
          <section className={styles.promptPayCard}>
            <div className={`${styles.promptPayHead} ThaiFont`}>
              <span className={styles.promptPayHeadMark}>P</span>
              Promptpay
            </div>
            <p className={`${styles.payCountdown} ThaiFont`}>
              กรุณาชำระภายใน {formatMmSs(qrSeconds)}
            </p>
            <div className={styles.promptPayBody}>
              <div className={styles.thaiQrBanner}>Thai QR Payment</div>
              <div className={styles.promptPayLogoRow}>
                <span className={styles.promptPayLogo}>PromptPay</span>
              </div>
              <div className={styles.qrBoxLarge}>
                <QrCode size={180} strokeWidth={1.2} color="#0b1f4a" />
              </div>
              <p className={`${styles.qrOrgName} ThaiFont`}>สภาเภสัชกรรม</p>
            </div>
          </section>
        ) : (
          <>
            <section className={styles.card}>
              <div className={styles.cardHead}>
                <h2 className={`${styles.cardTitle} ThaiFont`}>
                  <MapPin size={18} color="#686804" /> ที่อยู่จัดส่ง
                </h2>
              </div>
              <div className={styles.choiceRow}>
                <button
                  type="button"
                  className={`${styles.choice} ${shipMode === "council" ? styles.choiceActive : ""} ThaiFont`}
                  onClick={() => setShipMode("council")}
                >
                  <Building2 size={16} /> รับเองที่สภา
                </button>
                <button
                  type="button"
                  className={`${styles.choice} ${shipMode === "mine" ? styles.choiceActive : ""} ThaiFont`}
                  onClick={() => setShipMode("mine")}
                >
                  <MapPin size={16} /> ที่อยู่ของฉัน
                </button>
              </div>
              <div className={`${styles.infoBox} ThaiFont`}>
                {shipMode === "council" ? (
                  <>
                    <strong>
                      {COUNCIL_ADDRESS.title} | {COUNCIL_ADDRESS.phone}
                    </strong>
                    {COUNCIL_ADDRESS.lines.map((line) => (
                      <div key={line}>{line}</div>
                    ))}
                  </>
                ) : (
                  <>
                    <div className={styles.shipInfoHead}>
                      <div className={styles.shipInfoName}>
                        <strong>{selectedAddress.name}</strong>
                        <span className={styles.savedCardSep} />
                        <span className={styles.muted}>{selectedAddress.phone}</span>
                      </div>
                      <button
                        type="button"
                        className={`${styles.linkBtn} ThaiFont`}
                        onClick={() => setShowSavedAddresses(true)}
                      >
                        <Pencil size={14} /> เปลี่ยนที่อยู่
                      </button>
                    </div>
                    <div>{selectedAddress.line1}</div>
                    <div>{selectedAddress.line2}</div>
                  </>
                )}
              </div>
            </section>

            <section className={styles.card}>
              <h2 className={`${styles.cardTitle} ThaiFont`}>
                <Receipt size={18} color="#686804" /> หมายเลขคำขอ {module.requestNo}
              </h2>
              {module.slug === "sap-33" && courseCount === 0 && (
                <p className={`${styles.muted} ThaiFont`} style={{ marginTop: "0.75rem" }}>
                  ยังไม่มีหลักสูตรที่เลือก — กรุณากลับไปหน้ายื่นคำขอเพื่อเลือกหลักสูตร
                </p>
              )}
              <div className={styles.tableWrap} style={{ marginTop: "0.75rem" }}>
                <table className={styles.table}>
                  <thead>
                    <tr className="ThaiFont">
                      <th>รายการ</th>
                      <th style={{ width: 88, textAlign: "center" }}>จำนวน</th>
                      <th style={{ width: 110, textAlign: "right" }}>ราคา</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((row, i) => {
                      const isFeeBlock =
                        row.kind === "fee" || row.kind === "shipping";
                      const prev = lines[i - 1];
                      const showSep =
                        isFeeBlock &&
                        prev &&
                        prev.kind !== "fee" &&
                        prev.kind !== "shipping";
                      return (
                        <Fragment key={`${row.kind ?? "row"}-${row.item}-${i}`}>
                          {showSep && (
                            <tr aria-hidden>
                              <td colSpan={3} className={styles.paySepCell} />
                            </tr>
                          )}
                          <tr
                            className={`ThaiFont ${row.kind === "header" ? styles.payHeaderRow : ""}`}
                          >
                            <td
                              className={
                                row.kind === "course" ? styles.tableCourse : undefined
                              }
                            >
                              {row.item}
                            </td>
                            <td style={{ textAlign: "center" }}>{row.qty}</td>
                            <td style={{ textAlign: "right" }}>
                              {row.price.toLocaleString("th-TH", {
                                minimumFractionDigits: 2,
                              })}
                            </td>
                          </tr>
                        </Fragment>
                      );
                    })}
                    <tr className={`${styles.payTotalRow} ThaiFont`}>
                      <td colSpan={2}>
                        <strong>ยอดชำระรวม</strong>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <strong>
                          {total.toLocaleString("th-TH", {
                            minimumFractionDigits: 2,
                          })}
                        </strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className={styles.card}>
              <h2 className={`${styles.cardTitle} ThaiFont`}>
                <CreditCard size={18} color="#686804" /> ช่องทางการชำระเงิน
              </h2>
              <div className={styles.choiceRow} style={{ marginTop: "0.75rem", marginBottom: 0 }}>
                <button
                  type="button"
                  className={`${styles.choice} ${styles.choiceActive} ThaiFont`}
                >
                  <span className={styles.promptPayMark}>QR</span> QR Prompt pay
                </button>
              </div>
            </section>

            <section className={styles.card}>
              <h2 className={`${styles.cardTitle} ThaiFont`}>
                <Receipt size={18} color="#686804" /> ข้อมูลใบเสร็จรับเงิน
              </h2>
              <div className={styles.choiceRow}>
                <button
                  type="button"
                  className={`${styles.choice} ${receiptMode === "pharmacist" ? styles.choiceActive : ""} ThaiFont`}
                  onClick={() => setReceiptMode("pharmacist")}
                >
                  <UserRound size={16} /> นามเภสัชกร
                </button>
                <button
                  type="button"
                  className={`${styles.choice} ${receiptMode === "juristic" ? styles.choiceActive : ""} ThaiFont`}
                  onClick={() => setReceiptMode("juristic")}
                >
                  <Building2 size={16} /> นิติบุคคล
                </button>
              </div>
              <div className={`${styles.infoBox} ThaiFont`}>
                {receiptMode === "pharmacist" ? (
                  <>
                    <div className={styles.shipInfoHead}>
                      <div className={styles.shipInfoName}>
                        <strong>
                          คุณ{pharmacistReceipt.firstName} {pharmacistReceipt.lastName}
                        </strong>
                        <span className={styles.savedCardSep} />
                        <span className={styles.muted}>{pharmacistReceipt.phone}</span>
                      </div>
                      <button
                        type="button"
                        className={`${styles.linkBtn} ThaiFont`}
                        onClick={() => setEditingReceipt(true)}
                      >
                        <Pencil size={14} /> แก้ไข
                      </button>
                    </div>
                    <div>หมายเลขประจำตัวผู้เสียภาษี {pharmacistReceipt.taxId}</div>
                    <div>{pharmacistLines.line1}</div>
                    <div>{pharmacistLines.line2}</div>
                  </>
                ) : (
                  <>
                    <div className={styles.shipInfoHead}>
                      <div className={styles.shipInfoName}>
                        <strong>{juristicReceipt.companyName}</strong>
                        <span className={styles.savedCardSep} />
                        <span className={styles.muted}>{juristicReceipt.phone}</span>
                      </div>
                      <button
                        type="button"
                        className={`${styles.linkBtn} ThaiFont`}
                        onClick={() => setEditingReceipt(true)}
                      >
                        <Pencil size={14} /> แก้ไข
                      </button>
                    </div>
                    <div>หมายเลขประจำตัวผู้เสียภาษี {juristicReceipt.taxId}</div>
                    <div>
                      ผู้ติดต่อ คุณ{juristicReceipt.contactFirstName}{" "}
                      {juristicReceipt.contactLastName}
                    </div>
                    <div>{juristicLines.line1}</div>
                    <div>{juristicLines.line2}</div>
                  </>
                )}
              </div>
            </section>
          </>
        )}
      </EServiceShell>

      {payPhase === "checking" && (
        <div className={styles.overlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <Hourglass size={48} color="#c47a12" />
            <h2 className={`${styles.modalTitle} ThaiFont`}>กำลังตรวจสอบการชำระเงิน</h2>
            <p className={`${styles.modalDesc} ThaiFont`}>กรุณารอสักครู่</p>
          </div>
        </div>
      )}

      {payPhase === "success" && (
        <div className={styles.overlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <CheckCircle2 size={52} color="#3d6b1f" />
            <h2 className={`${styles.modalTitle} ThaiFont`}>ชำระเงินเรียบร้อย</h2>
            <p className={`${styles.modalDesc} ThaiFont`}>
              ระบบจะนำท่านเข้าสู่หน้าสถานะโดยอัตโนมัติ
            </p>
          </div>
        </div>
      )}

      {showSavedAddresses && !editingContact && (
        <SavedAddressesModal
          addresses={addresses}
          selectedId={selectedAddressId}
          onClose={() => setShowSavedAddresses(false)}
          onSave={(addr) => {
            setSelectedAddressId(addr.id);
            setShowSavedAddresses(false);
            setToast("บันทึกที่อยู่จัดส่งสำเร็จ");
          }}
          onEdit={(addr) => setEditingContact(addr)}
        />
      )}

      {editingContact && (
        <ContactAddressEditModal
          address={editingContact}
          onClose={() => {
            setEditingContact(null);
            setShowSavedAddresses(true);
          }}
          onSave={(updated) => {
            setAddresses((prev) =>
              prev.map((a) => {
                if (a.id === updated.id) return updated;
                if (updated.isDefault) {
                  return {
                    ...a,
                    isDefault: false,
                    tags: a.tags.filter((t) => t !== "default"),
                  };
                }
                return a;
              })
            );
            setSelectedAddressId(updated.id);
            setEditingContact(null);
            setShowSavedAddresses(true);
            setToast("บันทึกการแก้ไขที่อยู่สำเร็จ");
          }}
        />
      )}

      {editingReceipt && (
        <ReceiptEditModal
          mode={receiptMode}
          pharmacist={pharmacistReceipt}
          juristic={juristicReceipt}
          onClose={() => setEditingReceipt(false)}
          onSavePharmacist={(data) => {
            setPharmacistReceipt(data);
            setEditingReceipt(false);
            setToast("บันทึกการแก้ไขข้อมูลใบเสร็จสำเร็จ");
          }}
          onSaveJuristic={(data) => {
            setJuristicReceipt(data);
            setEditingReceipt(false);
            setToast("บันทึกการแก้ไขข้อมูลใบเสร็จสำเร็จ");
          }}
        />
      )}

      {showReceipt && (
        <ReceiptPreviewModal onClose={() => setShowReceipt(false)} />
      )}
      {toast && <ToastBanner message={toast} onDone={() => setToast(null)} />}
    </>
  );
}

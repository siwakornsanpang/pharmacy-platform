"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Check, ChevronLeft, FileCheck2, MapPin, QrCode, TicketCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { ConferenceApiError, getOrder } from "@/lib/conference/api";
import { formatMoney } from "@/lib/conference/checkout";
import { ensureConferenceSession } from "@/lib/conference/session";
import type { CheckoutOrder } from "@/lib/conference/types";
import { CheckoutProgress } from "./CheckoutProgress";
import { FlowError, FlowLoading } from "./CheckoutPageClient";
import styles from "./checkout-flow.module.css";

const dateText = (value: string) => new Date(value).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });

export function SuccessPageClient({ eventId, orderId }: { eventId: string; orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError("");
      try {
        await ensureConferenceSession();
        const result = await getOrder(orderId);
        if (!active) return;
        if (result.eventId !== eventId) throw new Error("Order does not belong to this Event");
        if (result.status === "awaitingPayment") return router.replace(`/meeting/${eventId}/payment?orderId=${encodeURIComponent(orderId)}`);
        if (result.status !== "paid") throw new Error("คำสั่งซื้อนี้ยังลงทะเบียนไม่สำเร็จ");
        setOrder(result);
      } catch (caught) {
        if (active) setError(caught instanceof ConferenceApiError ? caught.message : caught instanceof Error ? caught.message : "ไม่สามารถโหลดข้อมูลการลงทะเบียนได้");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [eventId, orderId, reload, router]);

  if (loading) return <FlowLoading label="กำลังจัดเตรียมบัตรลงทะเบียน..." />;
  if (!order) return <FlowError message={error || "ไม่พบข้อมูลการลงทะเบียน"} onRetry={() => setReload((value) => value + 1)} />;
  const free = Number(order.totalAmount) === 0;
  return <main className={`${styles.page} ThaiFont`}>
    <div className={`${styles.shell} ${styles.successShell}`}>
      <header className={styles.flowHeader}>
        <button type="button" className={styles.backLink} onClick={() => router.push(`/meeting/${eventId}`)}><ChevronLeft size={19} />กลับไปดูรายละเอียดงาน</button>
        <CheckoutProgress current="success" free={free} />
      </header>
      <section className={styles.successHero}><span className={styles.successSeal}><Check size={36} /></span><p className={styles.eyebrow}>Registration complete</p><h1>ลงทะเบียนสำเร็จ</h1><p>เก็บ QR ด้านล่างไว้สำหรับแสดงสิทธิ์และเช็กอินในวันงาน</p><div className={styles.orderCode}>ORDER · {order.number}</div></section>
      <section className={`${styles.card} ${styles.successEvent}`}><div><h2>{order.event?.nameTh}</h2><span><CalendarDays size={17} />{order.event ? `${dateText(order.event.startAt)} – ${dateText(order.event.endAt)}` : ""}</span><span><MapPin size={17} />{order.event?.locationName || "จะแจ้งสถานที่ภายหลัง"}</span></div><div><small>ยอดชำระ</small><strong>{formatMoney(order.totalAmount, order.currency)}</strong></div></section>
      <div className={styles.registrationGrid}>{order.registrations?.map((registration) => <article className={styles.registrationCard} key={registration.id}>
        <header><span><TicketCheck size={20} /></span><div><small>{registration.ticketKind === "primary" ? "บัตรหลัก" : "กิจกรรมเสริม"}</small><h2>{registration.ticketName}</h2></div></header>
        <div className={styles.qrFrame}><QRCodeSVG value={registration.qrPayload} size={176} level="M" title={`QR ลงทะเบียน ${registration.code}`} /><span><QrCode size={15} />สแกนรหัสนี้ในวันงาน</span></div>
        <div className={styles.registrationCode}><small>Registration code</small><strong>{registration.code}</strong></div>
        <div className={styles.sessionList}><span>Session ที่เข้าร่วมได้</span>{registration.sessions.map((session) => <small key={session.id}><Check size={14} />{session.name}</small>)}</div>
      </article>)}</div>
      {order.taxInvoice ? <section className={`${styles.card} ${styles.invoiceReceipt}`}><FileCheck2 size={24} /><div><h2>รับคำขอใบกำกับภาษีแล้ว</h2><p>{order.taxInvoice.taxpayerName} · {order.taxInvoice.maskedTaxId}</p><small>สถานะ: {order.taxInvoice.status === "requested" ? "รอดำเนินการออกเอกสาร" : order.taxInvoice.status}</small></div></section> : null}
      <div className={styles.successActions}><button type="button" className={styles.primaryButton} onClick={() => router.push("/member-meeting")}>ดูงานประชุมของฉัน</button><button type="button" className={styles.secondaryButton} onClick={() => router.push(`/meeting/${eventId}`)}>กลับไปดูรายละเอียดงาน</button></div>
    </div>
  </main>;
}

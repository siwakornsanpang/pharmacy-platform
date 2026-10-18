"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Building2, CheckCircle2, ChevronLeft, Clock3, CreditCard, FlaskConical, RotateCcw, XCircle } from "lucide-react";
import { cancelOrder, ConferenceApiError, confirmMockPayment, createPaymentAttempt, getOrder } from "@/lib/conference/api";
import { formatMoney } from "@/lib/conference/checkout";
import { ensureConferenceSession } from "@/lib/conference/session";
import type { CheckoutOrder, PaymentAttempt } from "@/lib/conference/types";
import { CheckoutProgress } from "./CheckoutProgress";
import { FlowError, FlowLoading } from "./CheckoutPageClient";
import styles from "./checkout-flow.module.css";

function countdownText(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  return `${String(minutes).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export function PaymentPageClient({ eventId, orderId }: { eventId: string; orderId: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<CheckoutOrder | null>(null);
  const [attempt, setAttempt] = useState<PaymentAttempt | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const attemptIntent = useRef<string | null>(null);
  const confirmationIntents = useRef<Record<string, string>>({});
  const cancelIntent = useRef<string | null>(null);
  const actionGuard = useRef(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError("");
      try {
        await ensureConferenceSession();
        const result = await getOrder(orderId);
        if (!active) return;
        if (result.eventId !== eventId) throw new Error("Order does not belong to this Event");
        if (result.status === "paid") return router.replace(`/meeting/${eventId}/success?orderId=${encodeURIComponent(orderId)}`);
        setOrder(result);
        const currentAttempt = result.payment?.latestAttempt;
        if (currentAttempt?.state === "pending") {
          setAttempt({
            id: currentAttempt.id, paymentId: currentAttempt.paymentId, orderId: result.id,
            state: currentAttempt.state, amount: result.totalAmount, currency: result.currency,
            provider: "ktb", mode: "mock", redirectUrl: null, expiresAt: currentAttempt.expiresAt,
            reusedPending: true, createdAt: currentAttempt.createdAt,
          });
        } else if (result.status === "awaitingPayment") {
          const key = attemptIntent.current ?? crypto.randomUUID();
          attemptIntent.current = key;
          const created = await createPaymentAttempt(orderId, key);
          if (active) { setAttempt(created); attemptIntent.current = null; }
        }
      } catch (caught) {
        if (active) setError(caught instanceof ConferenceApiError ? caught.message : "ไม่สามารถโหลดคำสั่งซื้อได้");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [eventId, orderId, reload, router]);

  useEffect(() => {
    if (!order?.expiresAt || order.status !== "awaitingPayment") return;
    const tick = () => setSecondsLeft(Math.max(0, Math.ceil((new Date(order.expiresAt!).getTime() - Date.now()) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [order?.expiresAt, order?.status]);

  async function createNewAttempt() {
    if (actionGuard.current) return;
    actionGuard.current = true; setWorking(true); setError("");
    const key = attemptIntent.current ?? crypto.randomUUID(); attemptIntent.current = key;
    try {
      const result = await createPaymentAttempt(orderId, key);
      setAttempt(result); setFailed(false); attemptIntent.current = null;
    } catch (caught) {
      if (caught instanceof ConferenceApiError && caught.problem.status < 500) attemptIntent.current = null;
      setError(caught instanceof ConferenceApiError ? caught.message : "การเชื่อมต่อขัดข้อง กรุณาลองอีกครั้ง");
    } finally { actionGuard.current = false; setWorking(false); }
  }

  async function confirm(outcome: "succeeded" | "failed") {
    if (!attempt || actionGuard.current) return;
    actionGuard.current = true; setWorking(true); setError("");
    const key = confirmationIntents.current[outcome] ?? crypto.randomUUID();
    confirmationIntents.current[outcome] = key;
    try {
      const result = await confirmMockPayment(orderId, attempt.id, outcome, key);
      delete confirmationIntents.current[outcome];
      setOrder(result.order);
      if (outcome === "succeeded") router.replace(`/meeting/${eventId}/success?orderId=${encodeURIComponent(orderId)}`);
      else { setAttempt(null); setFailed(true); }
    } catch (caught) {
      if (caught instanceof ConferenceApiError && caught.problem.status < 500) delete confirmationIntents.current[outcome];
      setError(caught instanceof ConferenceApiError ? caught.message : "การเชื่อมต่อขัดข้อง กรุณาลองคำสั่งเดิมอีกครั้ง");
    } finally { actionGuard.current = false; setWorking(false); }
  }

  async function cancel() {
    if (actionGuard.current) return;
    actionGuard.current = true; setWorking(true); setError("");
    const key = cancelIntent.current ?? crypto.randomUUID(); cancelIntent.current = key;
    try {
      const result = await cancelOrder(orderId, key);
      cancelIntent.current = null; setOrder(result); setAttempt(null);
    } catch (caught) {
      if (caught instanceof ConferenceApiError && caught.problem.status < 500) cancelIntent.current = null;
      setError(caught instanceof ConferenceApiError ? caught.message : "ไม่สามารถยกเลิกคำสั่งซื้อได้");
    } finally { actionGuard.current = false; setWorking(false); }
  }

  if (loading) return <FlowLoading label="กำลังเตรียมรายการชำระเงิน..." />;
  if (!order) return <FlowError message={error || "ไม่พบคำสั่งซื้อ"} onRetry={() => setReload((value) => value + 1)} />;
  const expired = order.status === "expired" || (order.status === "awaitingPayment" && secondsLeft === 0);
  const cancelled = order.status === "cancelled";

  return <main className={`${styles.page} ThaiFont`}>
    <div className={`${styles.shell} ${styles.paymentShell}`}>
      <header className={styles.flowHeader}>
        <button type="button" className={styles.backLink} onClick={() => router.push(`/meeting/${eventId}`)}><ChevronLeft size={19} />กลับไปดูรายละเอียดงาน</button>
        <CheckoutProgress current="payment" />
      </header>
      <div className={styles.paymentGrid}>
        <section className={`${styles.card} ${styles.paymentCard}`}>
          <div className={styles.mockBanner}><FlaskConical size={20} /><div><strong>KTB Mock</strong><span>โหมดจำลองสำหรับทดสอบระบบ ไม่มีการตัดเงินจริง</span></div></div>
          <div className={styles.paymentBrand}><span><Building2 size={25} /></span><div><p className={styles.eyebrow}>ช่องทางชำระเงิน</p><h1>ธนาคารกรุงไทย</h1></div></div>
          {expired || cancelled ? <div className={styles.terminalState}><span>{expired ? <Clock3 /> : <XCircle />}</span><h2>{expired ? "หมดเวลาถือสิทธิ์แล้ว" : "ยกเลิกคำสั่งซื้อแล้ว"}</h2><p>{expired ? "ที่นั่งถูกคืนเข้าสู่ระบบ กรุณาเริ่มลงทะเบียนใหม่" : "คำสั่งซื้อนี้ไม่สามารถชำระเงินต่อได้"}</p><button type="button" className={styles.primaryButton} onClick={() => router.push(`/meeting/${eventId}/checkout`)}>กลับไปเลือกบัตรใหม่</button></div> : <>
            <div className={`${styles.holdTimer} ${secondsLeft <= 180 ? styles.holdWarning : ""}`}><Clock3 size={20} /><span>ระบบถือสิทธิ์ไว้ให้อีก<strong>{countdownText(secondsLeft)}</strong></span></div>
            {failed ? <div className={styles.paymentFailed}><AlertTriangle size={20} /><div><strong>จำลองการชำระเงินไม่สำเร็จ</strong><span>ยังถือสิทธิ์ไว้ คุณสามารถสร้างรายการทดสอบใหม่ก่อนเวลาหมด</span></div></div> : null}
            {error ? <div className={styles.errorSummary} role="alert">{error}</div> : null}
            {attempt ? <div className={styles.mockActions}><button type="button" className={styles.successButton} onClick={() => void confirm("succeeded")} disabled={working}><CheckCircle2 size={19} />{working ? "กำลังประมวลผล..." : "จำลองชำระเงินสำเร็จ"}</button><button type="button" className={styles.failureButton} onClick={() => void confirm("failed")} disabled={working}><XCircle size={19} />จำลองชำระเงินไม่สำเร็จ</button></div> : <button type="button" className={styles.primaryButton} onClick={() => void createNewAttempt()} disabled={working || expired}><RotateCcw size={18} />{working ? "กำลังสร้างรายการ..." : "สร้างรายการชำระเงินใหม่"}</button>}
            <button type="button" className={styles.cancelButton} onClick={() => void cancel()} disabled={working}>ยกเลิกคำสั่งซื้อและคืนที่นั่ง</button>
          </>}
        </section>

        <aside className={styles.summaryCard}>
          <div className={styles.summaryTop}><span className={styles.summaryIcon}><CreditCard size={20} /></span><div><p className={styles.eyebrow}>คำสั่งซื้อ</p><h2>{order.number}</h2></div></div>
          <div className={styles.summaryEvent}>{order.event?.nameTh}</div>
          <div className={styles.summaryItems}>{order.items.map((item) => <div key={item.id}><span><strong>{item.ticketTypeName}</strong><small>{item.ticketKind === "primary" ? "บัตรหลัก" : "กิจกรรมเสริม"}</small></span><b>{formatMoney(item.amount, item.currency)}</b></div>)}</div>
          <div className={styles.totalRow}><span>ยอดที่ต้องชำระ</span><strong>{formatMoney(order.totalAmount, order.currency)}</strong></div>
          {order.taxInvoice ? <div className={styles.invoiceStatus}><FileTextIcon />ขอใบกำกับภาษี · {order.taxInvoice.maskedTaxId}</div> : null}
        </aside>
      </div>
    </div>
  </main>;
}

function FileTextIcon() {
  return <CreditCard size={15} aria-hidden="true" />;
}

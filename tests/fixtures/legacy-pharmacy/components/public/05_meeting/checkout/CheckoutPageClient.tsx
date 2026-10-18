"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckCircle2, ChevronLeft, CreditCard, FileText, IdCard, MapPin, ShieldCheck, Ticket, UserRound } from "lucide-react";
import { ConferenceApiError, createOrder, getConferenceProfile, getEventDetail, getPersonalizedOfferings } from "@/lib/conference/api";
import { emptyTaxInvoice, formatMoney, minorUnitsText, offeringReason, selectedOfferings, selectionTotal, validateTaxInvoice } from "@/lib/conference/checkout";
import { ensureConferenceSession } from "@/lib/conference/session";
import type { ConferenceAttendeeProfile, EventDetail, PersonalizedOffering, TaxInvoiceInput } from "@/lib/conference/types";
import { CheckoutProgress } from "./CheckoutProgress";
import styles from "./checkout-flow.module.css";

type InvoiceErrors = Partial<Record<keyof TaxInvoiceInput, string>>;

const dateText = (value: string) => new Date(value).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });

function Field({ label, name, value, error, onChange, inputMode, type = "text", placeholder }: {
  label: string;
  name: keyof TaxInvoiceInput;
  value: string;
  error?: string;
  onChange: (name: keyof TaxInvoiceInput, value: string) => void;
  inputMode?: "numeric" | "tel" | "email";
  type?: string;
  placeholder?: string;
}) {
  return <label className={styles.field}>
    <span>{label}</span>
    <input name={name} value={value} onChange={(event) => onChange(name, event.target.value)} inputMode={inputMode} type={type} placeholder={placeholder} aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-error` : undefined} />
    {error ? <small id={`${name}-error`} className={styles.fieldError}>{error}</small> : null}
  </label>;
}

function TaxInvoiceFields({ value, errors, onChange }: { value: TaxInvoiceInput; errors: InvoiceErrors; onChange: (name: keyof TaxInvoiceInput, value: string | null) => void }) {
  return <div className={styles.invoicePanel}>
    <div className={styles.segmented} role="radiogroup" aria-label="ประเภทผู้เสียภาษี">
      <label><input type="radio" name="taxpayerType" checked={value.taxpayerType === "individual"} onChange={() => onChange("taxpayerType", "individual")} /><span>บุคคลธรรมดา</span></label>
      <label><input type="radio" name="taxpayerType" checked={value.taxpayerType === "juristic"} onChange={() => onChange("taxpayerType", "juristic")} /><span>นิติบุคคล</span></label>
    </div>
    <div className={styles.formGrid}>
      <Field label="ชื่อผู้เสียภาษี" name="taxpayerName" value={value.taxpayerName} error={errors.taxpayerName} onChange={onChange} placeholder="ชื่อบุคคลหรือชื่อนิติบุคคล" />
      <Field label="เลขประจำตัวผู้เสียภาษี" name="taxId" value={value.taxId} error={errors.taxId} onChange={onChange} inputMode="numeric" placeholder="13 หลัก" />
      {value.taxpayerType === "juristic" ? <div className={styles.field}>
        <span>ประเภทสาขา</span>
        <select value={value.branchType ?? ""} onChange={(event) => onChange("branchType", event.target.value || null)} aria-invalid={Boolean(errors.branchType)}>
          <option value="">เลือกประเภทสาขา</option>
          <option value="headOffice">สำนักงานใหญ่</option>
          <option value="branch">สาขา</option>
        </select>
        {errors.branchType ? <small className={styles.fieldError}>{errors.branchType}</small> : null}
      </div> : null}
      {value.taxpayerType === "juristic" && value.branchType === "branch" ? <Field label="เลขสาขา" name="branchNumber" value={value.branchNumber ?? ""} error={errors.branchNumber} onChange={onChange} inputMode="numeric" placeholder="5 หลัก" /> : null}
      <label className={`${styles.field} ${styles.fieldWide}`}><span>ที่อยู่</span><textarea name="addressLine" value={value.addressLine} onChange={(event) => onChange("addressLine", event.target.value)} rows={3} aria-invalid={Boolean(errors.addressLine)} placeholder="เลขที่ อาคาร ถนน" />{errors.addressLine ? <small className={styles.fieldError}>{errors.addressLine}</small> : null}</label>
      <Field label="แขวง/ตำบล" name="subdistrict" value={value.subdistrict} error={errors.subdistrict} onChange={onChange} />
      <Field label="เขต/อำเภอ" name="district" value={value.district} error={errors.district} onChange={onChange} />
      <Field label="จังหวัด" name="province" value={value.province} error={errors.province} onChange={onChange} />
      <Field label="รหัสไปรษณีย์" name="postalCode" value={value.postalCode} error={errors.postalCode} onChange={onChange} inputMode="numeric" />
      <Field label="อีเมลรับเอกสาร" name="email" value={value.email} error={errors.email} onChange={onChange} inputMode="email" type="email" />
      <Field label="เบอร์โทรศัพท์" name="phone" value={value.phone} error={errors.phone} onChange={onChange} inputMode="tel" type="tel" />
    </div>
  </div>;
}

export function CheckoutPageClient({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [profile, setProfile] = useState<ConferenceAttendeeProfile | null>(null);
  const [offerings, setOfferings] = useState<PersonalizedOffering[]>([]);
  const [primaryId, setPrimaryId] = useState("");
  const [supplementaryIds, setSupplementaryIds] = useState<Set<string>>(new Set());
  const [invoiceRequested, setInvoiceRequested] = useState(false);
  const [invoice, setInvoice] = useState<TaxInvoiceInput>(emptyTaxInvoice);
  const [invoiceErrors, setInvoiceErrors] = useState<InvoiceErrors>({});
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const submitIntent = useRef<string | null>(null);
  const submitGuard = useRef(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError("");
      try {
        await ensureConferenceSession();
        const [eventResult, profileResult, offeringResult] = await Promise.all([
          getEventDetail(eventId), getConferenceProfile(), getPersonalizedOfferings(eventId),
        ]);
        if (!active) return;
        setEvent(eventResult);
        setProfile(profileResult);
        setOfferings(offeringResult.data);
        const availablePrimary = offeringResult.data.filter((item) => item.kind === "primary" && item.canPurchase);
        setPrimaryId(availablePrimary.length === 1 ? availablePrimary[0]!.ticketId : "");
        setSupplementaryIds(new Set());
        setInvoice((current) => ({
          ...current,
          taxpayerName: current.taxpayerName || profileResult.displayName,
          email: current.email || profileResult.email || "",
          phone: current.phone || profileResult.phone || "",
        }));
      } catch (caught) {
        if (active) setError(caught instanceof ConferenceApiError ? caught.message : "ไม่สามารถโหลดข้อมูลสำหรับลงทะเบียนได้");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [eventId, reload]);

  const chosen = useMemo(() => selectedOfferings(offerings, primaryId, supplementaryIds), [offerings, primaryId, supplementaryIds]);
  const totalMinor = useMemo(() => selectionTotal(chosen), [chosen]);
  const currency = chosen[0]?.currency ?? "THB";
  const needsPrimary = chosen.some((item) => item.kind === "supplementary" && item.requiresPrimary) && !primaryId;
  const paid = totalMinor > 0;

  const resetIntent = () => { submitIntent.current = null; };
  const choosePrimary = (ticketId: string) => { resetIntent(); setPrimaryId(ticketId); setError(""); };
  const chooseSupplementary = (ticketId: string) => {
    resetIntent(); setError("");
    setSupplementaryIds((current) => {
      const next = new Set(current);
      if (next.has(ticketId)) next.delete(ticketId); else next.add(ticketId);
      return next;
    });
  };
  const updateInvoice = (name: keyof TaxInvoiceInput, rawValue: string | null) => {
    resetIntent(); setInvoiceErrors((current) => ({ ...current, [name]: undefined }));
    setInvoice((current) => {
      if (name === "taxpayerType") {
        const taxpayerType = rawValue as TaxInvoiceInput["taxpayerType"];
        return { ...current, taxpayerType, ...(taxpayerType === "individual" ? { branchType: null, branchNumber: null } : {}) };
      }
      if (name === "branchType") return { ...current, branchType: rawValue as TaxInvoiceInput["branchType"], branchNumber: rawValue === "branch" ? current.branchNumber : null };
      return { ...current, [name]: rawValue };
    });
  };

  async function submit(eventObject: React.FormEvent) {
    eventObject.preventDefault();
    if (submitGuard.current) return;
    setError("");
    if (chosen.length === 0) return setError("กรุณาเลือกบัตรลงทะเบียนอย่างน้อยหนึ่งรายการ");
    if (needsPrimary) return setError("กิจกรรมเสริมที่เลือกต้องลงทะเบียนพร้อมบัตรหลัก");
    if (!acknowledged) return setError("กรุณายืนยันว่าข้อมูลและรายการที่เลือกถูกต้อง");
    if (invoiceRequested && paid) {
      const validation = validateTaxInvoice(invoice);
      setInvoiceErrors(validation);
      if (Object.keys(validation).length > 0) {
        setError("กรุณาตรวจสอบข้อมูลใบกำกับภาษี");
        window.requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
        return;
      }
    }

    submitGuard.current = true; setSubmitting(true);
    const key = submitIntent.current ?? crypto.randomUUID();
    submitIntent.current = key;
    try {
      const order = await createOrder({
        eventId,
        ticketTypeIds: chosen.map((item) => item.ticketId),
        expectedTotalAmount: minorUnitsText(totalMinor),
        expectedCurrency: currency,
        ...(invoiceRequested && paid ? { taxInvoice: invoice } : {}),
      }, key);
      submitIntent.current = null;
      router.push(order.status === "paid" ? `/meeting/${eventId}/success?orderId=${encodeURIComponent(order.id)}` : `/meeting/${eventId}/payment?orderId=${encodeURIComponent(order.id)}`);
    } catch (caught) {
      if (caught instanceof ConferenceApiError) {
        if (caught.problem.status < 500) submitIntent.current = null;
        if (caught.problem.code === "PRICE_CHANGED" || caught.problem.code === "CAPACITY_EXHAUSTED") setReload((value) => value + 1);
        if (caught.problem.code === "REGISTRATION_DUPLICATE") setError("คุณลงทะเบียนรายการนี้แล้ว กรุณาตรวจสอบงานประชุมของฉัน");
        else setError(caught.message);
        const fieldErrors: InvoiceErrors = {};
        for (const item of caught.problem.errors ?? []) {
          const field = item.path.split("/").at(-1) as keyof TaxInvoiceInput;
          if (field) fieldErrors[field] = item.message;
        }
        if (Object.keys(fieldErrors).length > 0) setInvoiceErrors(fieldErrors);
      } else {
        setError("การเชื่อมต่อขัดข้อง กดอีกครั้งเพื่อทำรายการเดิมต่อโดยไม่สร้างคำสั่งซื้อซ้ำ");
      }
    } finally { submitGuard.current = false; setSubmitting(false); }
  }

  if (loading) return <FlowLoading label="กำลังตรวจสอบสิทธิ์และราคาสำหรับคุณ..." />;
  if (!event || !profile) return <FlowError message={error || "ไม่พบข้อมูลสำหรับลงทะเบียน"} onRetry={() => setReload((value) => value + 1)} />;

  const primary = offerings.filter((item) => item.kind === "primary");
  const supplementary = offerings.filter((item) => item.kind === "supplementary");
  return <main className={`${styles.page} ThaiFont`}>
    <div className={styles.shell}>
      <header className={styles.flowHeader}>
        <button type="button" className={styles.backLink} onClick={() => router.push(`/meeting/${eventId}`)}><ChevronLeft size={19} />กลับไปดูรายละเอียดงาน</button>
        <CheckoutProgress current="checkout" />
      </header>

      <form id="conference-checkout-form" onSubmit={submit} className={styles.checkoutGrid}>
        <div className={styles.formColumn}>
          <section className={`${styles.card} ${styles.eventStrip}`}>
            <div className={styles.eventIcon}><Ticket size={24} /></div><div><p className={styles.eyebrow}>งานที่กำลังลงทะเบียน</p><h1>{event.nameTh}</h1><div className={styles.eventMeta}><span><CalendarDays size={16} />{dateText(event.startAt)} – {dateText(event.endAt)}</span><span><MapPin size={16} />{event.locationName || "จะแจ้งสถานที่ภายหลัง"}</span></div></div>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>ข้อมูลจากระบบ Pharmacy</p><h2>ข้อมูลผู้ลงทะเบียน</h2></div><span className={styles.verified}><ShieldCheck size={16} />ยืนยันแล้ว</span></div>
            <div className={styles.identityGrid}>
              <div><UserRound size={18} /><span>ชื่อ–นามสกุล<strong>{profile.displayName}</strong></span></div>
              <div><IdCard size={18} /><span>เลขที่ใบอนุญาต<strong>{profile.pharmacistLicense || "—"}</strong></span></div>
              <div><span>อีเมล<strong>{profile.email || "—"}</strong></span></div>
              <div><span>เบอร์โทรศัพท์<strong>{profile.phone || "—"}</strong></span></div>
            </div>
            <p className={styles.readOnlyNote}>ข้อมูลส่วนนี้อ่านจากบัญชี Pharmacy และแก้ไขในขั้นตอนนี้ไม่ได้</p>
          </section>

          <section className={styles.card}>
            <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>สิทธิ์ที่เข้าร่วม</p><h2>เลือกบัตรหลัก</h2></div><span className={styles.requiredBadge}>เลือก 1 รายการ</span></div>
            <div className={styles.ticketList}>{primary.length ? primary.map((offering) => <label key={offering.ticketId} className={`${styles.ticketOption} ${primaryId === offering.ticketId ? styles.ticketSelected : ""} ${!offering.canPurchase ? styles.ticketDisabled : ""}`}>
              <input type="radio" name="primaryTicket" checked={primaryId === offering.ticketId} disabled={!offering.canPurchase} onChange={() => choosePrimary(offering.ticketId)} />
              <span className={styles.ticketControl}></span><span className={styles.ticketBody}><span className={styles.ticketTitle}>{offering.ticketName}</span><span className={styles.ticketSessions}>{offering.sessions.map((session) => session.name).join(" · ")}</span>{!offering.canPurchase ? <small>{offeringReason(offering.reasonCode)}</small> : null}</span><strong className={styles.ticketPrice}>{formatMoney(offering.amount, offering.currency)}</strong>
            </label>) : <p className={styles.emptyText}>ไม่มีบัตรหลักสำหรับบัญชีนี้</p>}</div>
          </section>

          {supplementary.length > 0 ? <section className={styles.card}>
            <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>เพิ่มจากบัตรหลัก</p><h2>กิจกรรมเสริม</h2></div><span className={styles.optionalBadge}>เลือกได้หลายรายการ</span></div>
            <div className={styles.ticketList}>{supplementary.map((offering) => <label key={offering.ticketId} className={`${styles.ticketOption} ${supplementaryIds.has(offering.ticketId) ? styles.ticketSelected : ""} ${!offering.canPurchase ? styles.ticketDisabled : ""}`}>
              <input type="checkbox" checked={supplementaryIds.has(offering.ticketId)} disabled={!offering.canPurchase} onChange={() => chooseSupplementary(offering.ticketId)} />
              <span className={styles.checkControl}><CheckCircle2 size={16} /></span><span className={styles.ticketBody}><span className={styles.ticketTitle}>{offering.ticketName}</span><span className={styles.ticketSessions}>{offering.sessions.map((session) => session.name).join(" · ")}</span>{offering.requiresPrimary ? <small>ต้องเลือกพร้อมบัตรหลัก</small> : null}{!offering.canPurchase ? <small>{offeringReason(offering.reasonCode)}</small> : null}</span><strong className={styles.ticketPrice}>{formatMoney(offering.amount, offering.currency)}</strong>
            </label>)}</div>
          </section> : null}

          {paid ? <section className={styles.card}>
            <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>เอกสารการชำระเงิน</p><h2>ใบกำกับภาษี</h2></div><FileText size={22} /></div>
            <label className={styles.toggleRow}><input type="checkbox" checked={invoiceRequested} onChange={(eventObject) => { resetIntent(); setInvoiceRequested(eventObject.target.checked); setInvoiceErrors({}); }} /><span className={styles.toggle}></span><span><strong>ต้องการขอใบกำกับภาษี</strong><small>ข้อมูลจะผูกกับคำสั่งซื้อนี้และไม่แก้ไขโปรไฟล์ Pharmacy</small></span></label>
            {invoiceRequested ? <TaxInvoiceFields value={invoice} errors={invoiceErrors} onChange={updateInvoice} /> : null}
          </section> : null}

          <label className={`${styles.card} ${styles.acknowledgement}`}><input className={styles.acknowledgementInput} style={{ position: "static", opacity: 1, width: 22, height: 22, flex: "0 0 auto", cursor: "pointer", accentColor: "#737300", WebkitAppearance: "checkbox" }} type="checkbox" checked={acknowledged} onChange={(eventObject) => { resetIntent(); setAcknowledged(eventObject.target.checked); }} /><span>ฉันตรวจสอบข้อมูลผู้ลงทะเบียน รายการบัตร และยอดชำระแล้วว่าถูกต้อง</span></label>
          {error ? <div className={styles.errorSummary} role="alert">{error}</div> : null}
        </div>

        <aside className={styles.summaryCard}>
          <div className={styles.summaryTop}><span className={styles.summaryIcon}><CreditCard size={20} /></span><div><p className={styles.eyebrow}>บัตรสรุปการลงทะเบียน</p><h2>รายการของคุณ</h2></div></div>
          <div className={styles.summaryEvent}>{event.nameTh}</div>
          <div className={styles.summaryItems}>{chosen.length ? chosen.map((item) => <div key={item.ticketId}><span><strong>{item.ticketName}</strong><small>{item.kind === "primary" ? "บัตรหลัก" : "กิจกรรมเสริม"}</small></span><b>{formatMoney(item.amount, item.currency)}</b></div>) : <p>ยังไม่ได้เลือกรายการ</p>}</div>
          {chosen.flatMap((item) => item.sessions).length > 0 ? <div className={styles.entitlements}><span>Session ที่ได้รับ</span>{[...new Map(chosen.flatMap((item) => item.sessions).map((session) => [session.id, session])).values()].map((session) => <small key={session.id}>{session.name}</small>)}</div> : null}
          <div className={styles.totalRow}><span>ยอดรวม</span><strong>{formatMoney(totalMinor, currency)}</strong></div>
          <button type="submit" className={styles.primaryButton} disabled={submitting || chosen.length === 0}>{submitting ? "กำลังยืนยัน..." : paid ? "ยืนยันและไปชำระเงิน" : "ยืนยันการลงทะเบียน"}</button>
          <p className={styles.secureNote}><ShieldCheck size={15} />ระบบจะตรวจสอบราคาและที่นั่งอีกครั้งก่อนสร้างคำสั่งซื้อ</p>
        </aside>
      </form>
    </div>
    <div className={styles.mobileAction}><span><small>ยอดรวม</small><strong>{formatMoney(totalMinor, currency)}</strong></span><button type="submit" form="conference-checkout-form" disabled={submitting || chosen.length === 0}>{submitting ? "กำลังยืนยัน..." : "ดำเนินการต่อ"}</button></div>
  </main>;
}

export function FlowLoading({ label }: { label: string }) {
  return <main className={`${styles.page} ${styles.centered} ThaiFont`}><div className={styles.stateCard}><span className={styles.spinner}></span><h1>{label}</h1><p>กรุณารอสักครู่ ระบบกำลังเตรียมข้อมูลที่เป็นปัจจุบัน</p></div></main>;
}

export function FlowError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <main className={`${styles.page} ${styles.centered} ThaiFont`}><div className={styles.stateCard}><span className={styles.stateIcon}>!</span><h1>ดำเนินการต่อไม่ได้</h1><p>{message}</p>{onRetry ? <button type="button" className={styles.primaryButton} onClick={onRetry}>ลองใหม่</button> : null}</div></main>;
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, Check, ChevronDown, ChevronLeft, ChevronUp, Clock, Download, FileText, MapPin, Share2 } from "lucide-react";
import { FaGraduationCap } from "react-icons/fa";
import { useAuth } from "@/context/AuthContext";
import { conferenceAssetUrl, getEventDetail, getPersonalizedOfferings } from "@/lib/conference/api";
import { resolveMeetingRegistrationAction } from "@/lib/conference/checkout";
import { ensureConferenceSession } from "@/lib/conference/session";
import type { EventDetail, PersonalizedOffering } from "@/lib/conference/types";
import styles from "./meetingDetail.module.css";

const dateText = (value: string) => new Date(value).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
const timeText = (value: string) => value.slice(0, 5);
const fileSize = (bytes: number) => bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

interface Remaining { days: number; hours: number; minutes: number; seconds: number }
const emptyRemaining: Remaining = { days: 0, hours: 0, minutes: 0, seconds: 0 };

export default function MeetingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [offerings, setOfferings] = useState<PersonalizedOffering[]>([]);
  const [memberError, setMemberError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [agendaOpen, setAgendaOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState<Remaining>(emptyRemaining);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError(""); setMemberError(""); setOfferings([]);
      try {
        const detail = await getEventDetail(params.id);
        if (!active) return;
        setEvent(detail);
        if (isLoggedIn) {
          try {
            await ensureConferenceSession();
            const result = await getPersonalizedOfferings(detail.id);
            if (active) setOfferings(result.data);
          } catch { if (active) setMemberError("ไม่สามารถตรวจสอบสิทธิ์ลงทะเบียนได้ กรุณาลองใหม่"); }
        }
      } catch { if (active) setError("ไม่พบงานประชุมหรือไม่สามารถโหลดรายละเอียดได้"); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [params.id, isLoggedIn, reload]);

  useEffect(() => {
    if (!event) return;
    const calculate = () => {
      const difference = new Date(event.startAt).getTime() - Date.now();
      if (difference <= 0) return setRemaining(emptyRemaining);
      setRemaining({ days: Math.floor(difference / 86_400_000), hours: Math.floor(difference / 3_600_000) % 24, minutes: Math.floor(difference / 60_000) % 60, seconds: Math.floor(difference / 1000) % 60 });
    };
    calculate(); const timer = window.setInterval(calculate, 1000);
    return () => window.clearInterval(timer);
  }, [event]);

  const registration = resolveMeetingRegistrationAction(event, isLoggedIn, memberError, offerings);

  if (loading) return <div className={styles.pageWrapper}><div className={styles.container}><p className="ThaiFont">กำลังโหลดรายละเอียดงานประชุม...</p></div></div>;
  if (error || !event) return <div className={styles.pageWrapper}><div className={styles.container}><div className={styles.sectionCard}><p className="ThaiFont">{error}</p><button type="button" onClick={() => setReload((value) => value + 1)}>ลองใหม่</button></div></div></div>;

  const capacity = event.availability.capacity;
  const remainingSeats = event.availability.remaining;
  const full = event.availability.status === "full";
  const hero = conferenceAssetUrl(event.coverImageUrl);

  return <div className={styles.pageWrapper}>
    <div className={styles.banner} style={{ backgroundImage: `url("${hero}")` }}><div className={styles.bannerOverlay}>
      <button type="button" onClick={() => router.push(isLoggedIn ? "/member-meeting" : "/meeting")} className={styles.backBtn}><ChevronLeft size={20} /><span>กลับสู่หน้ารวม</span></button>
      <div className={styles.bannerContent}><h1 className={`${styles.bannerTitle} ThaiFont`}>{event.nameTh}</h1><div className={styles.bannerMeta}>
        <div className={styles.metaItem}><Calendar size={18} /><span>{dateText(event.startAt)} - {dateText(event.endAt)}</span></div>
        <div className={styles.metaItem}><MapPin size={18} /><span>{event.locationName || "จะแจ้งให้ทราบภายหลัง"}</span></div>
      </div></div>
    </div></div>

    <div className={styles.contentSection}><div className={styles.container}><div className={styles.mainGrid}>
      <div className={styles.leftCol}>
        <section className={styles.sectionCard}><h2 className="ThaiFont">รายละเอียด</h2><div className={styles.divider}></div><p className={`${styles.description} ThaiFont`}>{event.description || "ยังไม่มีรายละเอียดเพิ่มเติม"}</p></section>
        {event.agendas.length > 0 && <section className={styles.sectionCard}>
          <div className={styles.collapsibleHeader} onClick={() => setAgendaOpen((value) => !value)}><h2 className="ThaiFont">กำหนดการ</h2>{agendaOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}</div>
          {agendaOpen && <><div className={styles.divider}></div><div className={styles.timeline}>{event.agendas.map((item, index) => <div key={item.id} className={styles.timelineItem}>
            <div className={styles.timelineTime}><Clock size={16} className={styles.timeIcon} /><span>{timeText(item.startTime)} - {timeText(item.endTime)}</span></div>
            <div className={styles.timelineMarker}><div className={styles.markerDot}></div>{index < event.agendas.length - 1 && <div className={styles.markerLine}></div>}</div>
            <div className={styles.timelineContent}><p className="ThaiFont">{item.content}</p></div>
          </div>)}</div></>}
        </section>}
        {event.documents.length > 0 && <section className={styles.sectionCard}><h2 className="ThaiFont">เอกสารประกอบการประชุม</h2><div className={styles.divider}></div><div className={styles.documentList}>{event.documents.map((document) => <div key={document.id} className={styles.documentItem}>
          <div className={styles.documentInfo}><FileText size={24} className={styles.documentIcon} /><div className={styles.documentMeta}><span className={`${styles.documentName} ThaiFont`}>{document.title}</span><span className={styles.documentSize}>{fileSize(document.fileSize)}</span></div></div>
          <a href={conferenceAssetUrl(document.downloadUrl)} className={`${styles.downloadBtn} ThaiFont`}><Download size={18} />ดาวน์โหลด</a>
        </div>)}</div></section>}
      </div>

      <aside className={styles.rightCol}>
        <section className={`${styles.sectionCard} ${styles.cpeCard}`}><h3 className="ThaiFont">หน่วยกิตการศึกษาต่อเนื่อง (CPE)</h3><div className={styles.cpeCardContent}><div className={styles.cpeCardIconWrapper}><FaGraduationCap className={styles.cpeCardIcon} /></div><div className={styles.cpeCardTextWrapper}><span className={styles.cpeCardValue}><strong>{event.cpeCredits}</strong> <span className={styles.cpeCardUnitLabel}>หน่วยกิต</span></span><span className={styles.cpeCardLabel}>เมื่อสำเร็จการประชุมตามเงื่อนไข</span></div></div></section>
        <section className={`${styles.sectionCard} ${styles.countdownCard}`}><h3 className="ThaiFont">เริ่มงานในอีก</h3><div className={styles.countdownContainer}>{([['วัน', remaining.days], ['ชม.', remaining.hours], ['นาที', remaining.minutes], ['วิ', remaining.seconds]] as const).map(([label, value]) => <div key={label} className={styles.countdownItem}><span className={styles.countdownNumber}>{value}</span><span className={styles.countdownLabel}>{label}</span></div>)}</div>
          <div style={{ marginTop: "2rem", borderTop: "1px solid #eef2f6", paddingTop: "1.5rem" }}><h4 className="ThaiFont">สถานที่จัดงาน</h4><p className={`${styles.venueText} ThaiFont`}><MapPin size={16} className={styles.inlineIcon} />{event.locationName || "จะแจ้งให้ทราบภายหลัง"}</p>{event.mapEmbedUrl && <div className={styles.mapContainer}><iframe title="แผนที่สถานที่จัดงาน" src={event.mapEmbedUrl} width="100%" height="200" style={{ border: 0 }} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className={styles.mapIframe}></iframe></div>}</div>
        </section>
        <section className={`${styles.sectionCard} ${styles.registrationCard}`}><h3 className="ThaiFont">จำนวนผู้ลงทะเบียน</h3><div className={styles.registrationStats}><div className={styles.statsCountWrapper}><span className={`${styles.statsCountNumber} ${full ? styles.countFull : styles.countAvailable}`}>{event.availability.registered}</span>{capacity == null ? <span className={styles.statsCountUnit}> คน (ไม่จำกัด)</span> : <><span className={styles.statsCountSeparator}>/</span><span className={styles.statsCountTotal}>{capacity}</span><span className={styles.statsCountUnit}>คน</span></>}</div><span className={styles.statsPercent}>{remainingSeats == null ? "ไม่จำกัดจำนวน" : full ? "ที่นั่งเต็มแล้ว" : `ว่างอีก ${remainingSeats} ที่นั่ง`}</span></div>
          <button type="button" onClick={() => router.push(isLoggedIn ? `/meeting/${event.id}/checkout` : `/login?returnTo=${encodeURIComponent(`/meeting/${event.id}/checkout`)}`)} className={`${styles.registerBtn} ${registration.disabled ? styles.btnDisabled : styles.btnActive} ThaiFont`} disabled={registration.disabled}>{registration.label}</button>
          <button type="button" onClick={() => { void navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 2000); }} className={`${styles.shareLinkBtn} ThaiFont`}>{copied ? <Check size={18} /> : <Share2 size={18} />}<span>{copied ? "คัดลอกลิงก์สำเร็จ!" : "คัดลอกลิงก์"}</span></button>
          {!isLoggedIn && <p className={`${styles.loginPrompt} ThaiFont`}>*กรุณา <Link href="/login" className={styles.loginLink}>เข้าสู่ระบบ</Link> เพื่อตรวจสอบสิทธิ์ลงทะเบียน</p>}
          {memberError && <p className={`${styles.loginPrompt} ThaiFont`}>{memberError}</p>}
        </section>
      </aside>
    </div></div></div>
  </div>;
}

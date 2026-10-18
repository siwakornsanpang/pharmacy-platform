"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import Swal from "sweetalert2";
import {
  BadgeCheck,
  Shield,
  Link2,
  Printer,
  Award,
  GraduationCap,
  Briefcase,
  FlaskConical,
  School,
  Clock3,
  XCircle,
  FilePenLine,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import {
  getCurrentPassportSync,
  fullNameTh,
  fullNameEn,
  ageFromDob,
  maskCitizenId,
  formatThaiDate,
  daysUntilLicenseExpiry,
  verifyUrl,
  specializationsForDisplay,
  licenseStatusLabels,
  credentialTypeLabels,
  verificationLabels,
  type Verification,
} from "@/lib/member/passport/domain";
import {
  registrationData,
  studentDetailData,
  formatCourseCode,
} from "@/lib/member/passport/studentData";
import styles from "./PassportProfileContent.module.css";

const toneClass: Record<string, string> = {
  ok: styles.badgeOk,
  warn: styles.badgeWarn,
  danger: styles.badgeDanger,
  muted: styles.badgeMuted,
};

function VerifyBadge({ verification }: { verification: Verification }) {
  const meta = verificationLabels[verification.status];
  const Icon =
    verification.status === "verified"
      ? BadgeCheck
      : verification.status === "pending"
        ? Clock3
        : verification.status === "rejected"
          ? XCircle
          : FilePenLine;

  return (
    <span
      className={`${styles.verifyBadge} ${toneClass[meta.tone]}`}
      title={
        verification.verifiedBy
          ? `${meta.th} · ${verification.verifiedBy}`
          : meta.th
      }
    >
      <Icon size={14} />
      {meta.th}
    </span>
  );
}

function SectionHeader({
  label,
  icon: Icon,
  sub,
}: {
  label: string;
  icon: LucideIcon;
  sub?: string;
}) {
  return (
    <div className={styles.sectionHeader}>
      <Icon size={22} className={styles.sectionIcon} />
      <div>
        <h2 className={styles.sectionTitle}>{label}</h2>
        {sub ? <p className={styles.sectionSub}>{sub}</p> : null}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <div className={styles.fieldLabel}>{label}</div>
      <div className={`${styles.fieldValue} ${mono ? styles.mono : ""}`}>
        {value}
      </div>
    </div>
  );
}

export default function PassportProfileContent() {
  const p = getCurrentPassportSync();
  const specializations = specializationsForDisplay(p);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const licMeta = licenseStatusLabels[p.license.status];
  const expiryDays = daysUntilLicenseExpiry(p);
  const verifyFullUrl = origin
    ? verifyUrl(p.verifyToken, origin)
    : verifyUrl(p.verifyToken);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard?.writeText(verifyFullUrl);
      await Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "คัดลอกลิงก์ตรวจสอบแล้ว",
        showConfirmButton: false,
        timer: 1800,
      });
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={`${styles.wrap} ThaiFont`}>
      {/* Official document header + identity */}
      <section className={styles.card}>
        <div className={styles.docHeader}>
          <div className={styles.docHeaderInner}>
            <div className={styles.logoBox}>
              <Image
                src={p.issuingAuthority.logoUrl}
                alt={`ตราสัญลักษณ์${p.issuingAuthority.nameTh}`}
                width={56}
                height={56}
                className={styles.logoImg}
              />
            </div>
            <div className={styles.docHeaderText}>
              <h2 className={styles.authorityTh}>{p.issuingAuthority.nameTh}</h2>
              <p className={styles.authorityEn}>{p.issuingAuthority.nameEn}</p>
            </div>
            <div className={styles.profileTag}>
              <span className={styles.profileTagPill}>
                <BadgeCheck size={15} /> Pharmacist Profile
              </span>
              <p>ข้อมูลประวัติและสถานะทางวิชาชีพ</p>
            </div>
          </div>
        </div>

        <div className={styles.identityBand}>
          <div className={styles.photoCol}>
            <div className={styles.photoFrame}>
              <Image
                src={p.identity.photoUrl}
                alt={fullNameTh(p)}
                width={112}
                height={128}
                className={styles.photo}
              />
            </div>
            <span className={`${styles.verifyBadge} ${toneClass[licMeta.tone]}`}>
              {licMeta.tone === "ok" ? (
                <BadgeCheck size={14} />
              ) : (
                <ShieldAlert size={14} />
              )}
              ใบอนุญาต{licMeta.th}
            </span>
          </div>

          <div className={styles.identityMain}>
            <div>
              <h2 className={styles.personName}>{fullNameTh(p)}</h2>
              <p className={styles.personMeta}>
                {fullNameEn(p)} · อายุ {ageFromDob(p.identity.dateOfBirth)} ปี
              </p>
            </div>
            <div className={styles.fieldsGrid}>
              <Field label="รหัสสมาชิก" value={p.memberId} mono />
              <Field
                label="เลขที่ใบประกอบวิชาชีพ"
                value={p.license.licenseNumber}
                mono
              />
              <Field
                label="เลขบัตรประชาชน"
                value={maskCitizenId(p.identity.citizenId)}
                mono
              />
              <Field
                label="วันเกิด"
                value={formatThaiDate(p.identity.dateOfBirth)}
              />
              <Field label="สัญชาติ" value={p.identity.nationality} />
              <Field label="อีเมล" value={p.identity.email} />
              <Field
                label="สถาบันที่กำลังศึกษา"
                value="สถาบันฝึกอบรมโรงพยาบาลศิริราช"
              />
            </div>
            <div className={styles.focusRow}>
              <span className={styles.focusLabel}>สาขาที่มุ่งพัฒนา:</span>
              {p.focusAreas.map((f) => (
                <span key={f} className={styles.focusChip}>
                  {f}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.sideCol}>
            <div className={styles.licenseBox}>
              <div className={styles.licenseRow}>
                <span>รอบต่ออายุ</span>
                <strong>{p.license.renewalCycle}</strong>
              </div>
              <div className={styles.licenseRow}>
                <span>หมดอายุ</span>
                <strong>{formatThaiDate(p.license.expiresAt)}</strong>
              </div>
              <span
                className={`${styles.expiryBadge} ${
                  expiryDays < 180 ? styles.badgeWarn : styles.badgeOk
                }`}
              >
                {expiryDays > 0 ? `เหลืออีก ${expiryDays} วัน` : "หมดอายุแล้ว"}
              </span>
            </div>
            <div className={styles.qrBox}>
              <QRCodeSVG value={verifyFullUrl} size={96} level="M" />
              <span className={styles.qrToken}>{p.verifyToken}</span>
              <span className={styles.qrHint}>สแกนเพื่อตรวจสอบ</span>
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.actionBtn} onClick={handleCopyLink}>
            <Link2 size={16} /> คัดลอกลิงก์ตรวจสอบ
          </button>
          <button
            type="button"
            className={styles.actionBtn}
            onClick={() => window.print()}
          >
            <Printer size={16} /> พิมพ์
          </button>
        </div>
      </section>

      {/* Specializations + Qualifications */}
      <div className={styles.twoCol}>
        <section className={styles.cardPadded}>
          <SectionHeader
            label="ความเชี่ยวชาญเฉพาะทาง"
            icon={Award}
            sub="ประกาศนียบัตร → หนังสืออนุมัติ → วุฒิบัตร"
          />
          <div className={styles.stack}>
            {specializations.map((s) => (
              <div key={s.id} className={styles.itemCard}>
                <div className={styles.itemTop}>
                  <span className={styles.typePill}>
                    {credentialTypeLabels[s.type]}
                  </span>
                  <VerifyBadge verification={s.verification} />
                </div>
                <h3 className={styles.itemTitle}>{s.titleTh}</h3>
                <p className={styles.itemMeta}>
                  สาขา{s.specialtyTh} · {s.collegeShort}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.cardPadded}>
          <SectionHeader label="คุณวุฒิการศึกษา" icon={GraduationCap} />
          <div className={styles.stack}>
            {p.qualifications.map((q) => (
              <div key={q.id} className={styles.itemCard}>
                <div className={styles.itemTop}>
                  <div>
                    <h3 className={styles.itemTitle}>{q.degreeTh}</h3>
                    <p className={styles.itemPrimary}>{q.institution}</p>
                    <p className={styles.itemMeta}>
                      {q.field} · จบปี {q.graduationYear}
                      {q.gpa ? ` · GPA ${q.gpa}` : ""}
                    </p>
                  </div>
                  <VerifyBadge verification={q.verification} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Experience + Academic */}
      <div className={styles.twoCol}>
        <section className={styles.cardPadded}>
          <SectionHeader label="ประสบการณ์วิชาชีพ" icon={Briefcase} />
          <div className={styles.timeline}>
            {p.experience.map((e) => (
              <div key={e.id} className={styles.timelineItem}>
                <span
                  className={`${styles.timelineDot} ${
                    e.isCurrent ? styles.timelineDotActive : ""
                  }`}
                />
                <div className={styles.itemTop}>
                  <div>
                    <h3 className={styles.itemTitle}>{e.position}</h3>
                    <p className={styles.itemPrimary}>{e.organization}</p>
                    <p className={styles.itemMeta}>
                      {e.startYear} – {e.isCurrent ? "ปัจจุบัน" : e.endYear}
                      {e.employmentType ? ` · ${e.employmentType}` : ""}
                    </p>
                    {e.responsibilities ? (
                      <p className={styles.itemMeta}>{e.responsibilities}</p>
                    ) : null}
                  </div>
                  <VerifyBadge verification={e.verification} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.cardPadded}>
          <SectionHeader label="ผลงานวิชาการและวิจัย" icon={FlaskConical} />
          <div className={styles.stack}>
            {p.academicWork.map((a) => (
              <div key={a.id} className={styles.itemCard}>
                <div className={styles.itemTop}>
                  <div className={styles.minW0}>
                    <span className={styles.kindPill}>
                      {a.kind === "publication"
                        ? "ตีพิมพ์"
                        : a.kind === "research_project"
                          ? "โครงการวิจัย"
                          : a.kind === "speaker"
                            ? "วิทยากร"
                            : "รางวัล"}
                    </span>
                    <h3 className={styles.itemTitle}>{a.title}</h3>
                    <p className={styles.itemMeta}>
                      {a.role ? `${a.role} · ` : ""}
                      {a.venue ? `${a.venue} · ` : ""}ปี {a.year}
                    </p>
                  </div>
                  <VerifyBadge verification={a.verification} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Current study */}
      <section className={styles.cardPadded}>
        <SectionHeader
          label="การศึกษาปัจจุบัน"
          icon={School}
          sub={studentDetailData.program}
        />
        <div className={styles.studyGrid}>
          <Field label="วิทยาลัย" value={studentDetailData.college} />
          <Field
            label="สถาบันฝึกอบรม"
            value="สถาบันฝึกอบรมโรงพยาบาลศิริราช"
          />
          <Field
            label="หน่วยกิตสะสมทั้งหมด"
            value={`${studentDetailData.creditsEarned} จาก ${studentDetailData.creditsTotal} หน่วยกิต`}
          />
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>รหัสวิชา</th>
                <th>รายวิชา</th>
                <th>เวลาเรียน</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {registrationData.courses.map((course) => (
                <tr key={course.code}>
                  <td className={styles.mono}>{formatCourseCode(course.code)}</td>
                  <td className={styles.tableTitle}>{course.title}</td>
                  <td>{course.schedule}</td>
                  <td>
                    <span className={`${styles.verifyBadge} ${styles.badgeOk}`}>
                      ลงทะเบียนแล้ว
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className={styles.footerNote}>
        <Shield size={14} />
        Pharmacist Profile จัดทำโดย{p.issuingAuthority.nameTh} · ปรับปรุงล่าสุด{" "}
        {formatThaiDate(p.updatedAt)}
      </p>
    </div>
  );
}

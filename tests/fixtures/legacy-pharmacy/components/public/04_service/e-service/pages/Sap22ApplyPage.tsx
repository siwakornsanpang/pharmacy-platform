"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Pencil,
  QrCode,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { EServiceModule } from "../eServiceConfig";
import EServiceShell from "../EServiceShell";
import styles from "../EServiceShell.module.css";
import { Sb21Modal, type Sb21Reason } from "../modals";

type ThaiIdPhase = "idle" | "scanning" | "connected";

const THAI_ID_PROFILE = {
  titleTh: "นาย",
  firstNameTh: "สมชาย",
  lastNameTh: "รักชาติ",
  titleEn: "Mr.",
  firstNameEn: "Somchai",
  lastNameEn: "Rakchat",
  citizenId: "1-5021-31549-87-8",
  birthDate: "01/01/2543",
  nationality: "ไทย",
  address:
    "เลขที่ 123/12 หมู่บ้านแมวป่า ตรอก/ซอย 7 ถนนมิตรภาพ ตำบลปากช่อง อำเภอปากช่อง จังหวัดนครราชสีมา 30130",
};

const MANUAL_DOCS = [
  { id: "idcard", label: "สำเนาบัตรประจำตัวประชาชน", required: true },
  { id: "house", label: "สำเนาทะเบียนบ้าน", required: true },
  { id: "marriage", label: "เอกสารเปลี่ยนชื่อเนื่องจากสมรส (ถ้ามี)", required: false },
  { id: "multi", label: "เอกสารเปลี่ยนชื่อหลายครั้ง (ถ้ามี)", required: false },
  { id: "rank", label: "เอกสารรับรองยศ / อภิไธย (ถ้ามี)", required: false },
  { id: "other", label: "เอกสารอื่น ๆ", required: false },
] as const;

/**
 * Matches Figma UI+Prototype สภ22:
 * - ThaiID: ฟอร์ม + ปุ่ม → Scan → เชื่อมเรียบร้อย + สภ.21
 * - Manual: แก้ไขชื่อ/ยศ + ส่วนส่วนตัว + แนบหลักฐาน + ใบอนุญาต
 */
export default function Sap22ApplyPage({
  module,
  mode = "thaid",
  initialThaiIdPhase = "idle",
}: {
  module: EServiceModule;
  mode?: "thaid" | "manual";
  initialThaiIdPhase?: ThaiIdPhase;
}) {
  const [licenseOption, setLicenseOption] = useState<"edit" | "laminated">(
    "edit"
  );
  const [thaiIdPhase, setThaiIdPhase] = useState<ThaiIdPhase>(
    mode === "thaid" ? initialThaiIdPhase : "idle"
  );
  const [uploadedName, setUploadedName] = useState<string | null>(
    initialThaiIdPhase === "connected"
      ? "หนังสือรับรองการสำเร็จการศึกษา.pdf"
      : null
  );
  const [showSb21, setShowSb21] = useState(false);
  const [sb21Reason, setSb21Reason] = useState<Sb21Reason>("laminated");
  const [sb21Attached, setSb21Attached] = useState<Sb21Reason | null>(
    initialThaiIdPhase === "connected" ? null : null
  );
  const [blockedHint, setBlockedHint] = useState(false);

  // Manual: name/rank edits
  const [nameEdits, setNameEdits] = useState({
    prefix: true,
    firstName: true,
    lastName: true,
    rank: true,
    title: false,
  });
  const [personalEdits, setPersonalEdits] = useState({
    birthDate: true,
    nationality: true,
    university: true,
    country: true,
    gradDate: true,
  });
  const [manualDocs, setManualDocs] = useState<Record<string, string | null>>(
    {}
  );

  useEffect(() => {
    if (thaiIdPhase !== "scanning") return;
    const t = setTimeout(() => setThaiIdPhase("connected"), 2200);
    return () => clearTimeout(t);
  }, [thaiIdPhase]);

  const goNext = () => {
    if (mode === "thaid" && thaiIdPhase !== "connected") {
      setBlockedHint(true);
      setThaiIdPhase("scanning");
      return;
    }
    window.location.href = `/service/e-service/${module.slug}/payment`;
  };

  if (mode === "manual") {
    return (
      <>
        <EServiceShell
          module={module}
          activeStep="apply-manual"
          requestNo={module.requestNo}
          breadcrumbs={[
            { label: "หน้าแรก", href: "/home" },
            { label: "งานบริการ", href: "/service" },
            { label: module.formCode },
          ]}
          footerMeta={{ title: module.title, subtitle: module.feeLabel }}
          footerActions={[
            { label: "บันทึกแบบร่าง", variant: "ghost" },
            { label: "ต่อไป", onClick: goNext, variant: "primary" },
          ]}
        >
          <div className={`${styles.flowStrip} ThaiFont`}>
            <span className={styles.flowActive}>S1 Manual</span>
            <span className={styles.flowArrow}>→</span>
            <span>S2-1 ชำระเงิน</span>
            <a
              className={styles.linkBtn}
              href={`/service/e-service/${module.slug}/apply`}
              style={{ marginLeft: "auto" }}
            >
              สลับไปเส้น ThaiID
            </a>
          </div>

          {/* Figma: แก้ไขชื่อ / ยศ */}
          <section className={styles.card}>
            <h2 className={`${styles.cardTitle} ThaiFont`}>แก้ไขชื่อ / ยศ</h2>
            <p className={`${styles.muted} ThaiFont`} style={{ margin: "0.5rem 0 1rem" }}>
              ติ๊กเลือกรายการที่ต้องการแก้ไข แล้วกรอกข้อมูลใหม่ทั้งสองภาษา
            </p>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr className="ThaiFont">
                    <th style={{ width: 44 }} />
                    <th>ข้อมูล</th>
                    <th>ภาษาไทย</th>
                    <th>ภาษาอังกฤษ</th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ["prefix", "คำนำหน้า", "ภก.", "Mr.", true],
                      ["firstName", "เปลี่ยนชื่อ", "ชื่อภาษาไทย", "ชื่อภาษาอังกฤษ", false],
                      ["lastName", "เปลี่ยนนามสกุล", "นามสกุลภาษาไทย", "นามสกุลภาษาอังกฤษ", false],
                      ["rank", "ยศ", "ระบุยศ", "ระบุยศ (EN)", false],
                      ["title", "อภิไธย", "ระบุอภิไธย", "ระบุอภิไธย (EN)", false],
                    ] as const
                  ).map(([key, label, phTh, phEn, isSelect]) => (
                    <tr key={key} className="ThaiFont">
                      <td>
                        <input
                          type="checkbox"
                          checked={nameEdits[key]}
                          onChange={() =>
                            setNameEdits((p) => ({ ...p, [key]: !p[key] }))
                          }
                        />
                      </td>
                      <td>{label}</td>
                      <td>
                        {isSelect ? (
                          <select className="ThaiFont" disabled={!nameEdits[key]} defaultValue="ภก.">
                            <option>ภก.</option>
                            <option>ภญ.</option>
                            <option>นาย</option>
                            <option>นาง</option>
                            <option>นางสาว</option>
                          </select>
                        ) : (
                          <input className="ThaiFont" placeholder={phTh} disabled={!nameEdits[key]} />
                        )}
                      </td>
                      <td>
                        {isSelect ? (
                          <select className="ThaiFont" disabled={!nameEdits[key]} defaultValue="Mr.">
                            <option>Mr.</option>
                            <option>Mrs.</option>
                            <option>Miss</option>
                            <option>Ms.</option>
                          </select>
                        ) : (
                          <input className="ThaiFont" placeholder={phEn} disabled={!nameEdits[key]} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Figma: แก้ไขข้อมูลส่วนตัว */}
          <section className={styles.card}>
            <h2 className={`${styles.cardTitle} ThaiFont`} style={{ marginBottom: "1rem" }}>
              แก้ไขข้อมูลส่วนตัว
            </h2>
            <div className={styles.checkFieldList}>
              {(
                [
                  ["birthDate", "วันเกิด", "01/01/2000", "date"],
                  ["nationality", "สัญชาติ", "ระบุสัญชาติ", "text"],
                  ["university", "มหาวิทยาลัย", "ระบุมหาวิทยาลัย", "text"],
                  ["country", "ประเทศ", "ระบุประเทศ", "text"],
                  ["gradDate", "วันที่สำเร็จการศึกษา", "01/01/2024", "date"],
                ] as const
              ).map(([key, label, placeholder]) => (
                <label key={key} className={styles.checkFieldRow}>
                  <input
                    type="checkbox"
                    checked={personalEdits[key]}
                    onChange={() =>
                      setPersonalEdits((p) => ({ ...p, [key]: !p[key] }))
                    }
                  />
                  <span className={`${styles.checkFieldLabel} ThaiFont`}>{label}</span>
                  <input
                    className={`ThaiFont ${styles.checkFieldInput}`}
                    placeholder={placeholder}
                    disabled={!personalEdits[key]}
                    defaultValue={key.includes("Date") ? placeholder : ""}
                  />
                </label>
              ))}
            </div>
          </section>

          {/* Figma: แบบหลักฐาน */}
          <section className={styles.card}>
            <h2 className={`${styles.cardTitle} ThaiFont`} style={{ marginBottom: "1rem" }}>
              แบบหลักฐาน
            </h2>
            <div className={styles.docGrid}>
              {MANUAL_DOCS.map((doc) => (
                <div key={doc.id} className={styles.docSlot}>
                  <div className={`${styles.docSlotLabel} ThaiFont`}>
                    {doc.label}
                    {doc.required && <span className={styles.requiredStar}>*</span>}
                  </div>
                  {manualDocs[doc.id] ? (
                    <div className={`${styles.uploadedFile} ThaiFont`}>
                      <FileText size={16} />
                      <span>{manualDocs[doc.id]}</span>
                      <button
                        type="button"
                        className={styles.iconBtn}
                        aria-label="ลบไฟล์"
                        onClick={() =>
                          setManualDocs((p) => ({ ...p, [doc.id]: null }))
                        }
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={`${styles.uploadBox} ${styles.uploadBoxCompact} ThaiFont`}
                      onClick={() =>
                        setManualDocs((p) => ({
                          ...p,
                          [doc.id]: `${doc.label}.pdf`,
                        }))
                      }
                    >
                      <Upload size={18} />
                      <div>ลากไฟล์มาวางที่นี่ หรือคลิกเพื่ออัปโหลดไฟล์</div>
                      <div className={styles.muted}>Maximum: 10 MB (.pdf)</div>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>

          <LicenseSection
            licenseOption={licenseOption}
            setLicenseOption={setLicenseOption}
            sb21Attached={sb21Attached}
            onOpenSb21={(reason) => {
              setSb21Reason(reason);
              setShowSb21(true);
            }}
            onClearSb21={() => setSb21Attached(null)}
            compact
          />
        </EServiceShell>

        {showSb21 && (
          <Sb21Modal
            reason={sb21Reason}
            onClose={() => setShowSb21(false)}
            onConfirm={() => {
              setSb21Attached(sb21Reason);
              setShowSb21(false);
            }}
          />
        )}
      </>
    );
  }

  // ——— ThaiID path ———
  return (
    <>
      <EServiceShell
        module={module}
        activeStep="apply"
        requestNo={module.requestNo}
        breadcrumbs={[
          { label: "หน้าแรก", href: "/home" },
          { label: "งานบริการ", href: "/service" },
          { label: module.formCode },
        ]}
        footerMeta={{ title: module.title, subtitle: module.feeLabel }}
        footerActions={[
          { label: "บันทึกแบบร่าง", variant: "ghost" },
          { label: "ต่อไป", onClick: goNext, variant: "primary" },
        ]}
      >
        <div className={`${styles.flowStrip} ThaiFont`}>
          <span className={thaiIdPhase === "idle" ? styles.flowActive : ""}>
            1. หน้าฟอร์ม
          </span>
          <span className={styles.flowArrow}>→</span>
          <span className={thaiIdPhase === "scanning" ? styles.flowActive : ""}>
            2. Scan บนแอป
          </span>
          <span className={styles.flowArrow}>→</span>
          <span className={thaiIdPhase === "connected" ? styles.flowActive : ""}>
            3. เชื่อมเรียบร้อย
          </span>
          <span className={styles.flowArrow}>→</span>
          <span>4. ต่อไป (S2-1)</span>
          <a
            className={styles.linkBtn}
            href={`/service/e-service/${module.slug}/apply-manual`}
            style={{ marginLeft: "auto" }}
          >
            เส้น Manual
          </a>
        </div>

        <section className={styles.card}>
          {thaiIdPhase !== "connected" ? (
            <div className={`${styles.centerBlock} ThaiFont`} style={{ marginBottom: 0 }}>
              <button
                type="button"
                className={styles.thaiIdBtn}
                onClick={() => {
                  setBlockedHint(false);
                  setThaiIdPhase("scanning");
                }}
              >
                <span className={styles.thaiIdLogo}>ThaiID</span>
                เชื่อมต่อข้อมูลกับ ThaiID
              </button>
              <p className={styles.muted} style={{ marginTop: "0.65rem" }}>
                เชื่อมต่อข้อมูลกับ ThaiID เพื่ออัปเดตข้อมูลส่วนบุคคลอัตโนมัติ
                โดยไม่ต้องแสดงเอกสารยืนยัน
              </p>
              <p className={styles.muted} style={{ marginTop: "0.35rem", fontSize: "0.85rem" }}>
                บังคับให้เชื่อม ThaiID เพื่อยืนยันหลักฐาน และอัปเดตข้อมูลอัตโนมัติ
                — แก้ไขได้แค่ข้อมูลมหาวิทยาลัย
              </p>
              {blockedHint && (
                <div className={styles.warningBox}>
                  กรุณาเชื่อมต่อ ThaiID ก่อนกด「ต่อไป」
                </div>
              )}
            </div>
          ) : (
            <div className={`${styles.thaiIdSuccess} ThaiFont`}>
              <CheckCircle2 size={22} color="#3d6b1f" />
              <span>เชื่อมต่อข้อมูล ThaiID เรียบร้อย</span>
              <button
                type="button"
                className={styles.linkBtn}
                onClick={() => {
                  setThaiIdPhase("idle");
                  setUploadedName(null);
                  setSb21Attached(null);
                }}
              >
                ยกเลิกการเชื่อมต่อ
              </button>
            </div>
          )}
        </section>

        {thaiIdPhase === "connected" && (
          <section className={styles.card}>
            <h2 className={`${styles.cardTitle} ThaiFont`} style={{ marginBottom: "1rem" }}>
              ข้อมูลส่วนตัว
            </h2>
            <p className={`${styles.muted} ThaiFont`} style={{ marginBottom: "0.85rem" }}>
              ดึงจาก ThaiID อัตโนมัติ (แก้ไขไม่ได้)
            </p>
            <div className={styles.profileGrid}>
              <ProfileField label="คำนำหน้า (ไทย)" value={THAI_ID_PROFILE.titleTh} />
              <ProfileField label="ชื่อ (ไทย)" value={THAI_ID_PROFILE.firstNameTh} />
              <ProfileField label="นามสกุล (ไทย)" value={THAI_ID_PROFILE.lastNameTh} />
              <ProfileField label="คำนำหน้า (EN)" value={THAI_ID_PROFILE.titleEn} />
              <ProfileField label="ชื่อ (EN)" value={THAI_ID_PROFILE.firstNameEn} />
              <ProfileField label="นามสกุล (EN)" value={THAI_ID_PROFILE.lastNameEn} />
              <ProfileField label="เลขบัตรประชาชน" value={THAI_ID_PROFILE.citizenId} />
              <ProfileField label="วันเกิด" value={THAI_ID_PROFILE.birthDate} />
              <ProfileField label="สัญชาติ" value={THAI_ID_PROFILE.nationality} />
              <div className={`${styles.field} ${styles.fieldWide}`}>
                <label className="ThaiFont">ที่อยู่ตามบัตรประชาชน</label>
                <div className={`${styles.infoBox} ThaiFont`}>{THAI_ID_PROFILE.address}</div>
              </div>
            </div>
          </section>
        )}

        <section className={styles.card}>
          <h2 className={`${styles.cardTitle} ThaiFont`} style={{ marginBottom: "1rem" }}>
            แก้ไขข้อมูลมหาวิทยาลัย
          </h2>
          <div className={styles.fieldGrid}>
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <label className="ThaiFont">ชื่อมหาวิทยาลัย</label>
              <input
                className="ThaiFont"
                placeholder="กรุณาระบุชื่อหน่วยงาน"
                defaultValue={thaiIdPhase === "connected" ? "มหาวิทยาลัยมหิดล" : ""}
              />
            </div>
            <div className={styles.field}>
              <label className="ThaiFont">ประเทศ</label>
              <select className="ThaiFont" defaultValue="ไทย">
                <option>ไทย</option>
                <option>อื่น ๆ</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className="ThaiFont">วันสำเร็จการศึกษา</label>
              <input className="ThaiFont" placeholder="01/01/2000" defaultValue="01/01/2000" />
            </div>
            <div className={`${styles.field} ${styles.fieldWide}`}>
              <label className="ThaiFont">
                แนบหลักฐาน (เลือก 1) ใบรับรองจบ / ทรานสคริปต์ / ปริญญาบัตร
              </label>
              {uploadedName ? (
                <div className={`${styles.uploadedFile} ThaiFont`}>
                  <FileText size={18} />
                  <span>{uploadedName}</span>
                  <button
                    type="button"
                    className={styles.iconBtn}
                    aria-label="ลบไฟล์"
                    onClick={() => setUploadedName(null)}
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className={`${styles.uploadBox} ThaiFont`}
                  onClick={() =>
                    setUploadedName("หนังสือรับรองการสำเร็จการศึกษา.pdf")
                  }
                >
                  <Upload size={22} />
                  <div>ลากไฟล์มาวางที่นี่ หรือคลิกเพื่อเพิ่มไฟล์</div>
                  <div className={styles.muted}>Maximum: 10 MB (.pdf)</div>
                </button>
              )}
            </div>
          </div>
        </section>

        <LicenseSection
          licenseOption={licenseOption}
          setLicenseOption={(v) => {
            setLicenseOption(v);
            if (v === "edit") setSb21Attached(null);
          }}
          sb21Attached={sb21Attached}
          onOpenSb21={(reason) => {
            setSb21Reason(reason);
            setShowSb21(true);
          }}
          onClearSb21={() => setSb21Attached(null)}
        />
      </EServiceShell>

      {thaiIdPhase === "scanning" && (
        <div className={styles.overlay} role="dialog" aria-modal="true">
          <div className={styles.thaiIdModal}>
            <button
              type="button"
              className={styles.modalClose}
              aria-label="ปิด"
              onClick={() => setThaiIdPhase("idle")}
            >
              <X size={18} />
            </button>
            <h2
              className={`${styles.modalTitle} ThaiFont`}
              style={{ textAlign: "left", marginTop: 0 }}
            >
              แสกน QR Code ยืนยันตัวตนบนแอป ThaiID
            </h2>
            <div className={styles.thaiIdModalBody}>
              <div className={styles.qrBox} aria-hidden>
                <QrCode size={148} strokeWidth={1.25} />
                <span className={styles.qrBadge}>ThaiID</span>
              </div>
              <div className={`${styles.thaiIdSteps} ThaiFont`}>
                <strong>ขั้นตอน</strong>
                <ol>
                  <li>เปิดแอปพลิเคชัน ThaiID</li>
                  <li>กดปุ่มสแกนบนหน้าแรกของแอป</li>
                  <li>สแกน QR Code ที่แสดงบนหน้าจอคอมพิวเตอร์</li>
                  <li>ยืนยันตัวตนในแอป และกรอก PIN</li>
                  <li>ระบบจะเชื่อมต่อทันทีเมื่อยืนยันสำเร็จ</li>
                </ol>
                <p className={styles.muted}>
                  กำลังรอสแกนจากแอป… (ตัวอย่างจะไปสถานะ「เชื่อมเรียบร้อย」อัตโนมัติ)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSb21 && (
        <Sb21Modal
          reason={sb21Reason}
          onClose={() => setShowSb21(false)}
          onConfirm={() => {
            setSb21Attached(sb21Reason);
            setShowSb21(false);
          }}
        />
      )}
    </>
  );
}

function LicenseSection({
  licenseOption,
  setLicenseOption,
  sb21Attached,
  onOpenSb21,
  onClearSb21,
  compact = false,
}: {
  licenseOption: "edit" | "laminated";
  setLicenseOption: (v: "edit" | "laminated") => void;
  sb21Attached: Sb21Reason | null;
  onOpenSb21: (reason: Sb21Reason) => void;
  onClearSb21: () => void;
  compact?: boolean;
}) {
  return (
    <section className={styles.card}>
      <h2 className={`${styles.cardTitle} ThaiFont`} style={{ marginBottom: "1rem" }}>
        {compact ? "แก้ไขในใบอนุญาต" : "แก้ไขใบอนุญาต"}
      </h2>
      <div className={styles.radioList}>
        <label className={styles.radioItem}>
          <input
            type="radio"
            checked={licenseOption === "edit"}
            onChange={() => setLicenseOption("edit")}
          />
          <div className="ThaiFont">
            <strong>
              {compact
                ? "สามารถแก้ไขในใบอนุญาตใบเดิมได้"
                : "สามารถแก้ไขใบอนุญาตใบเดิมได้"}
            </strong>
            <p className={styles.muted} style={{ margin: "0.35rem 0 0" }}>
              กรุณาส่งใบอนุญาตฉบับจริงมายังสำนักงานเลขาธิการสภาเภสัชกรรม
              อาคารมหิตลาธิเบศร ชั้น 8 กระทรวงสาธารณสุข
              เลขที่ 88/19 หมู่ 4 ถนนติวานนท์ ตำบลตลาดขวัญ อำเภอเมือง จังหวัดนนทบุรี 11000
            </p>
            {licenseOption === "edit" && (
              <div className={styles.warningBox}>
                กรุณาเขียนชื่อเภสัชกรและหมายเลขคำขอที่หน้าซองให้ชัดเจน
              </div>
            )}
          </div>
        </label>
        <label className={styles.radioItem}>
          <input
            type="radio"
            checked={licenseOption === "laminated"}
            onChange={() => setLicenseOption("laminated")}
          />
          <div className="ThaiFont">
            <strong>ใส่กรอบและเคลือบ ไม่สามารถแก้ไขใบอนุญาตได้</strong>
            <p className={styles.muted} style={{ margin: "0.35rem 0 0" }}>
              ต้องยื่นคำขอ สภ.21 เพื่อขอใบแทน (ค่าธรรมเนียม 500 บาท)
            </p>
            {licenseOption === "laminated" && (
              <div className={styles.sb21Actions}>
                {!sb21Attached ? (
                  <button
                    type="button"
                    className={`${styles.linkBtn} ThaiFont`}
                    onClick={() => onOpenSb21("laminated")}
                  >
                    ยื่นคำขอสภ.21
                  </button>
                ) : (
                  <>
                    <span className={`${styles.badge} ${styles.badgeWarning}`}>
                      แนบแล้ว: สภ.21{" "}
                      {sb21Attached === "laminated"
                        ? "เคลือบ"
                        : sb21Attached === "damaged"
                          ? "ชำรุด"
                          : "สูญหาย"}
                    </span>
                    <button
                      type="button"
                      className={`${styles.linkBtn} ThaiFont`}
                      onClick={() => onOpenSb21(sb21Attached)}
                    >
                      <Pencil size={14} /> แก้ไข
                    </button>
                    <button
                      type="button"
                      className={`${styles.linkBtn} ThaiFont`}
                      onClick={onClearSb21}
                    >
                      <Trash2 size={14} /> ลบ
                    </button>
                  </>
                )}
                {/* demo: open other สภ.21 reasons from Figma frames */}
                <div className={styles.choiceRow} style={{ marginTop: "0.5rem", marginBottom: 0 }}>
                  <button type="button" className={`${styles.btnGhost} ThaiFont`} onClick={() => onOpenSb21("laminated")}>
                    Modal สภ.21 เคลือบ
                  </button>
                  <button type="button" className={`${styles.btnGhost} ThaiFont`} onClick={() => onOpenSb21("damaged")}>
                    Modal สภ.21 ชำรุด
                  </button>
                  <button type="button" className={`${styles.btnGhost} ThaiFont`} onClick={() => onOpenSb21("lost")}>
                    Modal สภ.21 สูญหาย
                  </button>
                </div>
              </div>
            )}
          </div>
        </label>
      </div>
    </section>
  );
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.field}>
      <label className="ThaiFont">{label}</label>
      <div className={`${styles.readonlyValue} ThaiFont`}>{value}</div>
    </div>
  );
}

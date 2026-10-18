"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Home,
  Pencil,
  X,
} from "lucide-react";
import {
  MOCK_SAVED_ADDRESSES,
  type JuristicReceiptInfo,
  type PharmacistReceiptInfo,
  type ReceiptAddressFields,
  type SavedAddress,
} from "./mockData";
import styles from "./EServiceShell.module.css";

const PROVINCE_OPTIONS = [
  "นครราชสีมา",
  "กรุงเทพมหานคร",
  "นนทบุรี",
  "ปทุมธานี",
];

function AddressFieldGrid({
  form,
  onChange,
}: {
  form: ReceiptAddressFields;
  onChange: (key: keyof ReceiptAddressFields, value: string) => void;
}) {
  return (
    <div className={styles.fieldGrid3}>
      <div className={styles.field}>
        <label className="ThaiFont">
          เลขที่ <span className={styles.requiredStar}>*</span>
        </label>
        <input
          className="ThaiFont"
          value={form.houseNo}
          onChange={(e) => onChange("houseNo", e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label className="ThaiFont">หมู่บ้าน/อาคาร</label>
        <input
          className="ThaiFont"
          value={form.village}
          onChange={(e) => onChange("village", e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label className="ThaiFont">หมู่ที่</label>
        <input
          className="ThaiFont"
          value={form.moo}
          onChange={(e) => onChange("moo", e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label className="ThaiFont">ตรอก/ซอย</label>
        <input
          className="ThaiFont"
          value={form.soi}
          onChange={(e) => onChange("soi", e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label className="ThaiFont">
          ถนน <span className={styles.requiredStar}>*</span>
        </label>
        <input
          className="ThaiFont"
          value={form.road}
          onChange={(e) => onChange("road", e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label className="ThaiFont">
          ตำบล/แขวง <span className={styles.requiredStar}>*</span>
        </label>
        <input
          className="ThaiFont"
          value={form.subdistrict}
          onChange={(e) => onChange("subdistrict", e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label className="ThaiFont">
          อำเภอ/เขต <span className={styles.requiredStar}>*</span>
        </label>
        <input
          className="ThaiFont"
          value={form.district}
          onChange={(e) => onChange("district", e.target.value)}
        />
      </div>
      <div className={styles.field}>
        <label className="ThaiFont">
          จังหวัด <span className={styles.requiredStar}>*</span>
        </label>
        <select
          className="ThaiFont"
          value={form.province}
          onChange={(e) => onChange("province", e.target.value)}
        >
          {PROVINCE_OPTIONS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label className="ThaiFont">
          รหัสไปรษณีย์ <span className={styles.requiredStar}>*</span>
        </label>
        <input
          className="ThaiFont"
          value={form.zip}
          onChange={(e) => onChange("zip", e.target.value)}
        />
      </div>
    </div>
  );
}

export function Overlay({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.modalWide}>
        {onClose && (
          <button
            type="button"
            className={styles.modalClose}
            aria-label="ปิด"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

export function AddressEditModal({
  title = "แก้ไขที่อยู่จัดส่ง",
  onClose,
  onSave,
}: {
  title?: string;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Overlay onClose={onClose}>
      <h2 className={`${styles.modalTitle} ThaiFont`} style={{ textAlign: "left", marginTop: 0 }}>
        {title}
      </h2>
      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label className="ThaiFont">ชื่อผู้รับ</label>
          <input className="ThaiFont" defaultValue="คุณสมชาย รักชาติ" />
        </div>
        <div className={styles.field}>
          <label className="ThaiFont">เบอร์โทรศัพท์</label>
          <input className="ThaiFont" defaultValue="081-2154-161" />
        </div>
        <div className={`${styles.field} ${styles.fieldWide}`}>
          <label className="ThaiFont">ที่อยู่</label>
          <textarea
            className="ThaiFont"
            rows={3}
            defaultValue="เลขที่ 123/12 หมู่บ้านแมวป่า ตรอก/ซอย 7 ถนนมิตรภาพ ตำบลปากช่อง อำเภอปากช่อง จังหวัดนครราชสีมา 30130"
          />
        </div>
      </div>
      <div className={styles.footerActions} style={{ marginTop: "1.25rem", justifyContent: "flex-end" }}>
        <button type="button" className={`${styles.btnOutline} ThaiFont`} onClick={onClose}>
          ยกเลิก
        </button>
        <button type="button" className={`${styles.btnPrimary} ThaiFont`} onClick={onSave}>
          บันทึก
        </button>
      </div>
    </Overlay>
  );
}

export function FilterModal({
  onClose,
  onApply,
}: {
  onClose: () => void;
  onApply: () => void;
}) {
  return (
    <Overlay onClose={onClose}>
      <h2 className={`${styles.modalTitle} ThaiFont`} style={{ textAlign: "left", marginTop: 0 }}>
        กรองข้อมูล
      </h2>
      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label className="ThaiFont">ช่วงวันที่อบรม</label>
          <input className="ThaiFont" placeholder="จากวันที่" />
        </div>
        <div className={styles.field}>
          <label className="ThaiFont">ถึงวันที่</label>
          <input className="ThaiFont" placeholder="ถึงวันที่" />
        </div>
        <div className={`${styles.field} ${styles.fieldWide}`}>
          <label className="ThaiFont">หลักสูตร (เลือกได้หลายอัน)</label>
          <select className="ThaiFont" multiple size={4} defaultValue={[]}>
            <option>Digital Health & AI</option>
            <option>เภสัชกรรมชุมชน</option>
            <option>กัญชาทางการแพทย์</option>
            <option>สร้างเสริมภูมิคุ้มกันโรค</option>
          </select>
        </div>
        <div className={`${styles.field} ${styles.fieldWide}`}>
          <label className="ThaiFont">ประกาศนียบัตร (เลือกได้หลายอัน)</label>
          <select className="ThaiFont" multiple size={3} defaultValue={[]}>
            <option>ประกาศนียบัตรวิชาชีพ</option>
            <option>ประกาศนียบัตรระยะสั้น</option>
          </select>
        </div>
      </div>
      <div className={styles.footerActions} style={{ marginTop: "1.25rem", justifyContent: "flex-end" }}>
        <button type="button" className={`${styles.btnOutline} ThaiFont`} onClick={onClose}>
          ล้างค่า
        </button>
        <button type="button" className={`${styles.btnPrimary} ThaiFont`} onClick={onApply}>
          ใช้ตัวกรอง
        </button>
      </div>
    </Overlay>
  );
}

export type Sb21Reason = "laminated" | "damaged" | "lost";

export function Sb21Modal({
  reason,
  onClose,
  onConfirm,
}: {
  reason: Sb21Reason;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const title =
    reason === "laminated"
      ? "คำขอ สภ.21 — ใส่กรอบและเคลือบ"
      : reason === "damaged"
        ? "คำขอ สภ.21 — ใบอนุญาตชำรุด"
        : "คำขอ สภ.21 — ใบอนุญาตสูญหาย";

  return (
    <Overlay onClose={onClose}>
      <h2 className={`${styles.modalTitle} ThaiFont`} style={{ textAlign: "left", marginTop: 0 }}>
        {title}
      </h2>
      <p className={`${styles.muted} ThaiFont`}>
        ค่าธรรมเนียม 500 บาท จะถูกรวมในรายการชำระเงินของคำขอ สภ.22
      </p>
      <div className={styles.fieldGrid} style={{ marginTop: "1rem" }}>
        <div className={`${styles.field} ${styles.fieldWide}`}>
          <label className="ThaiFont">เหตุผล / รายละเอียดเพิ่มเติม</label>
          <textarea className="ThaiFont" rows={3} placeholder="ระบุรายละเอียด" />
        </div>
        <div className={`${styles.field} ${styles.fieldWide}`}>
          <label className="ThaiFont">แนบหลักฐาน (ถ้ามี)</label>
          <div className={`${styles.uploadBox} ThaiFont`}>ลากไฟล์มาวาง หรือคลิกเพื่อเพิ่มไฟล์ (PDF สูงสุด 10 MB)</div>
        </div>
      </div>
      <div className={styles.footerActions} style={{ marginTop: "1.25rem", justifyContent: "flex-end" }}>
        <button type="button" className={`${styles.btnOutline} ThaiFont`} onClick={onClose}>
          ยกเลิก
        </button>
        <button type="button" className={`${styles.btnPrimary} ThaiFont`} onClick={onConfirm}>
          ยืนยันยื่น สภ.21
        </button>
      </div>
    </Overlay>
  );
}

export function ReceiptEditModal({
  mode = "pharmacist",
  pharmacist,
  juristic,
  onClose,
  onSavePharmacist,
  onSaveJuristic,
}: {
  mode?: "pharmacist" | "juristic";
  pharmacist: PharmacistReceiptInfo;
  juristic: JuristicReceiptInfo;
  onClose: () => void;
  onSavePharmacist: (data: PharmacistReceiptInfo) => void;
  onSaveJuristic: (data: JuristicReceiptInfo) => void;
}) {
  const [pharmacistForm, setPharmacistForm] =
    useState<PharmacistReceiptInfo>(pharmacist);
  const [juristicForm, setJuristicForm] = useState<JuristicReceiptInfo>(juristic);

  const setPharmacist = (key: keyof PharmacistReceiptInfo, value: string) =>
    setPharmacistForm((prev) => ({ ...prev, [key]: value }));
  const setJuristic = (key: keyof JuristicReceiptInfo, value: string) =>
    setJuristicForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Overlay onClose={onClose}>
      <h2
        className={`${styles.modalTitle} ThaiFont`}
        style={{ textAlign: "left", marginTop: 0 }}
      >
        {mode === "pharmacist"
          ? "แก้ไขข้อมูลบุคคลธรรมดา"
          : "แก้ไขข้อมูลนิติบุคคล"}
      </h2>

      {mode === "pharmacist" ? (
        <>
          <div className={styles.fieldGrid3}>
            <div className={styles.field}>
              <label className="ThaiFont">ชื่อ</label>
              <input
                className="ThaiFont"
                value={pharmacistForm.firstName}
                onChange={(e) => setPharmacist("firstName", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className="ThaiFont">นามสกุล</label>
              <input
                className="ThaiFont"
                value={pharmacistForm.lastName}
                onChange={(e) => setPharmacist("lastName", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className="ThaiFont">เบอร์โทรศัพท์</label>
              <input
                className="ThaiFont"
                value={pharmacistForm.phone}
                onChange={(e) => setPharmacist("phone", e.target.value)}
              />
            </div>
          </div>
          <div className={styles.field} style={{ marginTop: "0.85rem" }}>
            <label className="ThaiFont">หมายเลขประจำตัวผู้เสียภาษี</label>
            <input
              className="ThaiFont"
              value={pharmacistForm.taxId}
              onChange={(e) => setPharmacist("taxId", e.target.value)}
            />
          </div>
        </>
      ) : (
        <>
          <div className={styles.fieldGrid}>
            <div className={styles.field}>
              <label className="ThaiFont">ชื่อบริษัท / นิติบุคคล</label>
              <input
                className="ThaiFont"
                value={juristicForm.companyName}
                onChange={(e) => setJuristic("companyName", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className="ThaiFont">หมายเลขประจำตัวผู้เสียภาษี</label>
              <input
                className="ThaiFont"
                value={juristicForm.taxId}
                onChange={(e) => setJuristic("taxId", e.target.value)}
              />
            </div>
          </div>
          <div className={styles.fieldGrid3} style={{ marginTop: "0.85rem" }}>
            <div className={styles.field}>
              <label className="ThaiFont">ชื่อผู้ติดต่อ</label>
              <input
                className="ThaiFont"
                value={juristicForm.contactFirstName}
                onChange={(e) => setJuristic("contactFirstName", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className="ThaiFont">นามสกุลผู้ติดต่อ</label>
              <input
                className="ThaiFont"
                value={juristicForm.contactLastName}
                onChange={(e) => setJuristic("contactLastName", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className="ThaiFont">เบอร์โทรศัพท์</label>
              <input
                className="ThaiFont"
                value={juristicForm.phone}
                onChange={(e) => setJuristic("phone", e.target.value)}
              />
            </div>
          </div>
        </>
      )}

      <div className={styles.modalDivider} />
      <h3 className={`${styles.modalSectionTitle} ThaiFont`}>ที่อยู่ผู้ประกอบการ</h3>
      <AddressFieldGrid
        form={mode === "pharmacist" ? pharmacistForm : juristicForm}
        onChange={(key, value) =>
          mode === "pharmacist"
            ? setPharmacist(key, value)
            : setJuristic(key, value)
        }
      />

      <div className={styles.modalStickyFooter}>
        <button
          type="button"
          className={`${styles.btnGhost} ThaiFont`}
          onClick={onClose}
        >
          ยกเลิก
        </button>
        <button
          type="button"
          className={`${styles.btnPrimary} ThaiFont`}
          onClick={() => {
            if (mode === "pharmacist") {
              onSavePharmacist(pharmacistForm);
            } else {
              onSaveJuristic(juristicForm);
            }
          }}
        >
          บันทึก
        </button>
      </div>
    </Overlay>
  );
}

export function ReceiptPreviewModal({ onClose }: { onClose: () => void }) {
  return (
    <Overlay onClose={onClose}>
      <h2 className={`${styles.modalTitle} ThaiFont`} style={{ textAlign: "left", marginTop: 0 }}>
        ใบเสร็จรับเงิน
      </h2>
      <div className={`${styles.infoBox} ThaiFont`}>
        <strong>สภาเภสัชกรรม</strong>
        <div>เลขที่ใบเสร็จ RE-2569-00021</div>
        <div>ผู้ชำระเงิน: นาย สมชาย รักชาติ</div>
        <div>รายการ: ค่าธรรมเนียมคำขอ E-Service</div>
        <div>ยอดชำระ: 570.00 บาท</div>
        <div>ช่องทาง: QR PromptPay</div>
        <div>วันเวลา: 04-01-2026 16:00</div>
      </div>
      <div className={styles.footerActions} style={{ marginTop: "1.25rem", justifyContent: "flex-end" }}>
        <button type="button" className={`${styles.btnGhost} ThaiFont`} onClick={onClose}>
          ปิด
        </button>
        <button type="button" className={`${styles.btnPrimary} ThaiFont`}>
          พิมพ์ใบเสร็จ
        </button>
      </div>
    </Overlay>
  );
}

export function ToastBanner({
  message,
  tone = "success",
  onDone,
}: {
  message: string;
  tone?: "success" | "warning" | "danger";
  onDone?: () => void;
}) {
  useEffect(() => {
    if (!onDone) return;
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  const cls =
    tone === "danger"
      ? styles.badgeDanger
      : tone === "warning"
        ? styles.badgeWarning
        : styles.badgeSuccess;

  return (
    <div className={`${styles.toastFixed} ThaiFont ${cls}`}>
      <CheckCircle2 size={16} />
      {message}
    </div>
  );
}

/** Figma: ที่อยู่ที่บันทึกไว้ */
export function SavedAddressesModal({
  addresses = MOCK_SAVED_ADDRESSES,
  selectedId,
  onClose,
  onSave,
  onEdit,
}: {
  addresses?: SavedAddress[];
  selectedId: string;
  onClose: () => void;
  onSave: (address: SavedAddress) => void;
  onEdit: (address: SavedAddress) => void;
}) {
  const [picked, setPicked] = useState(selectedId);

  return (
    <Overlay onClose={onClose}>
      <h2
        className={`${styles.modalTitle} ThaiFont`}
        style={{ textAlign: "left", marginTop: 0 }}
      >
        ที่อยู่ที่บันทึกไว้
      </h2>
      <div className={styles.savedList}>
        {addresses.map((addr) => {
          const active = picked === addr.id;
          return (
            <button
              key={addr.id}
              type="button"
              className={`${styles.savedCard} ${active ? styles.savedCardActive : ""}`}
              onClick={() => setPicked(addr.id)}
            >
              <div className={styles.savedCardIcon}>
                {addr.type === "work" ? (
                  <Building2 size={20} color="#686804" />
                ) : (
                  <Home size={20} color="#686804" />
                )}
              </div>
              <div className={styles.savedCardBody}>
                <div className={styles.savedCardTop}>
                  <div className={`${styles.savedCardName} ThaiFont`}>
                    <strong>{addr.name}</strong>
                    <span className={styles.savedCardSep} />
                    <span className={styles.muted}>{addr.phone}</span>
                  </div>
                  <span
                    className={`${styles.linkBtn} ThaiFont`}
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(addr);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        onEdit(addr);
                      }
                    }}
                  >
                    <Pencil size={14} /> แก้ไข
                  </span>
                </div>
                <p className={`${styles.savedCardAddr} ThaiFont`}>
                  {addr.line1} {addr.line2}
                </p>
                <div className={styles.savedTags}>
                  {addr.tags.includes("default") && (
                    <span className={`${styles.tagDefault} ThaiFont`}>ค่าตั้งต้น</span>
                  )}
                  {addr.tags.includes("home") && (
                    <span className={`${styles.tagHome} ThaiFont`}>บ้าน</span>
                  )}
                  {addr.tags.includes("work") && (
                    <span className={`${styles.tagWork} ThaiFont`}>ที่ทำงาน</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className={styles.modalStickyFooter}>
        <button
          type="button"
          className={`${styles.btnGhost} ThaiFont`}
          onClick={onClose}
        >
          ยกเลิก
        </button>
        <button
          type="button"
          className={`${styles.btnPrimary} ThaiFont`}
          onClick={() => {
            const addr = addresses.find((a) => a.id === picked);
            if (addr) onSave(addr);
          }}
        >
          บันทึก
        </button>
      </div>
    </Overlay>
  );
}

/** Figma: แก้ไขที่อยู่ที่ติดต่อได้ */
export function ContactAddressEditModal({
  address,
  onClose,
  onSave,
}: {
  address: SavedAddress;
  onClose: () => void;
  onSave: (address: SavedAddress) => void;
}) {
  const [type, setType] = useState<"home" | "work">(address.type);
  const [isDefault, setIsDefault] = useState(address.isDefault);
  const [form, setForm] = useState({
    firstName: address.firstName,
    lastName: address.lastName,
    phone: address.phone,
    houseNo: address.houseNo,
    village: address.village,
    moo: address.moo,
    soi: address.soi,
    road: address.road,
    subdistrict: address.subdistrict,
    district: address.district,
    province: address.province,
    zip: address.zip,
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Overlay onClose={onClose}>
      <h2
        className={`${styles.modalTitle} ThaiFont`}
        style={{ textAlign: "left", marginTop: 0 }}
      >
        แก้ไขที่อยู่ที่ติดต่อได้
      </h2>

      <div className={styles.choiceRow}>
        <button
          type="button"
          className={`${styles.choice} ${type === "home" ? styles.choiceActive : ""} ThaiFont`}
          onClick={() => setType("home")}
        >
          <Home size={16} /> บ้าน
        </button>
        <button
          type="button"
          className={`${styles.choice} ${type === "work" ? styles.choiceActive : ""} ThaiFont`}
          onClick={() => setType("work")}
        >
          <Building2 size={16} /> ที่ทำงาน
        </button>
      </div>

      <div className={styles.fieldGrid3}>
        <div className={styles.field}>
          <label className="ThaiFont">ชื่อ</label>
          <input
            className="ThaiFont"
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            placeholder="กรุณาระบุชื่อ"
          />
        </div>
        <div className={styles.field}>
          <label className="ThaiFont">นามสกุล</label>
          <input
            className="ThaiFont"
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            placeholder="กรุณาระบุนามสกุล"
          />
        </div>
        <div className={styles.field}>
          <label className="ThaiFont">เบอร์โทรศัพท์</label>
          <input
            className="ThaiFont"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className="ThaiFont">
            เลขที่ <span className={styles.requiredStar}>*</span>
          </label>
          <input
            className="ThaiFont"
            value={form.houseNo}
            onChange={(e) => set("houseNo", e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className="ThaiFont">หมู่บ้าน/อาคาร</label>
          <input
            className="ThaiFont"
            value={form.village}
            onChange={(e) => set("village", e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className="ThaiFont">หมู่ที่</label>
          <input
            className="ThaiFont"
            value={form.moo}
            onChange={(e) => set("moo", e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className="ThaiFont">ตรอก/ซอย</label>
          <input
            className="ThaiFont"
            value={form.soi}
            onChange={(e) => set("soi", e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className="ThaiFont">
            ถนน <span className={styles.requiredStar}>*</span>
          </label>
          <input
            className="ThaiFont"
            value={form.road}
            onChange={(e) => set("road", e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className="ThaiFont">
            ตำบล/แขวง <span className={styles.requiredStar}>*</span>
          </label>
          <input
            className="ThaiFont"
            value={form.subdistrict}
            onChange={(e) => set("subdistrict", e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className="ThaiFont">
            อำเภอ/เขต <span className={styles.requiredStar}>*</span>
          </label>
          <input
            className="ThaiFont"
            value={form.district}
            onChange={(e) => set("district", e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className="ThaiFont">
            จังหวัด <span className={styles.requiredStar}>*</span>
          </label>
          <select
            className="ThaiFont"
            value={form.province}
            onChange={(e) => set("province", e.target.value)}
          >
            <option>นครราชสีมา</option>
            <option>กรุงเทพมหานคร</option>
            <option>นนทบุรี</option>
            <option>ปทุมธานี</option>
          </select>
        </div>
        <div className={styles.field}>
          <label className="ThaiFont">
            รหัสไปรษณีย์ <span className={styles.requiredStar}>*</span>
          </label>
          <input
            className="ThaiFont"
            value={form.zip}
            onChange={(e) => set("zip", e.target.value)}
          />
        </div>
      </div>

      <label className={`${styles.toggleRow} ThaiFont`}>
        <button
          type="button"
          className={`${styles.toggle} ${isDefault ? styles.toggleOn : ""}`}
          aria-pressed={isDefault}
          onClick={() => setIsDefault((v) => !v)}
        >
          <span className={styles.toggleKnob} />
        </button>
        ตั้งเป็นที่อยู่เริ่มต้น
      </label>

      <div className={styles.modalStickyFooter}>
        <button
          type="button"
          className={`${styles.btnGhost} ThaiFont`}
          onClick={onClose}
        >
          ยกเลิก
        </button>
        <button
          type="button"
          className={`${styles.btnPrimary} ThaiFont`}
          onClick={() => {
            const line1 = `เลขที่ ${form.houseNo} หมู่บ้าน/อาคาร ${form.village} ตรอก/ซอย ${form.soi} ถนน ${form.road}`;
            const line2 = `ตำบล ${form.subdistrict} อำเภอ ${form.district} จังหวัด ${form.province} ${form.zip}`;
            const tags: SavedAddress["tags"] = [
              ...(isDefault ? (["default"] as const) : []),
              type === "home" ? "home" : "work",
            ];
            onSave({
              ...address,
              ...form,
              name: `คุณ${form.firstName} ${form.lastName}`,
              type,
              isDefault,
              tags,
              line1,
              line2,
            });
          }}
        >
          บันทึก
        </button>
      </div>
    </Overlay>
  );
}

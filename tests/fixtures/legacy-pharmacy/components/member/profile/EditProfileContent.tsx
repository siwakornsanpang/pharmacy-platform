"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Save } from "lucide-react";
import Swal from "sweetalert2";
import styles from "./EditProfileContent.module.css";

interface EditProfileContentProps {
    userName: string;
    userId: string;
}

type FieldProps = {
    label: string;
    required?: boolean;
    hint?: string;
    suffix?: string;
    children: ReactNode;
    wide?: boolean;
};

function Field({ label, required, hint, suffix, children, wide }: FieldProps) {
    return (
        <div className={`${styles.field} ${wide ? styles.fieldWide : ""}`}>
            <label className={styles.fieldLabel}>
                {label}
                {required && <span className={styles.required}>*</span>}
            </label>
            <div className={styles.fieldControl}>
                <div className={styles.controlRow}>
                    {children}
                    {suffix && <span className={styles.suffix}>{suffix}</span>}
                </div>
                {hint && <p className={styles.hint}>{hint}</p>}
            </div>
        </div>
    );
}

function Section({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>{title}</h2>
                {description && <p className={styles.sectionDesc}>{description}</p>}
            </div>
            <div className={styles.sectionBody}>{children}</div>
        </section>
    );
}

function Row({ children }: { children: ReactNode }) {
    return <div className={styles.row}>{children}</div>;
}

export default function EditProfileContent({ userName, userId }: EditProfileContentProps) {
    const router = useRouter();

    const [prefixEn, setPrefixEn] = useState("");
    const [firstNameEn, setFirstNameEn] = useState("");
    const [lastNameEn, setLastNameEn] = useState("");
    const [race, setRace] = useState("");
    const [mainPractice, setMainPractice] = useState("");
    const [subPractice, setSubPractice] = useState("");
    const [newsChannel, setNewsChannel] = useState("");

    const [idNo, setIdNo] = useState("");
    const [idVillage, setIdVillage] = useState("");
    const [idMoo, setIdMoo] = useState("");
    const [idAlley, setIdAlley] = useState("");
    const [idRoad, setIdRoad] = useState("");
    const [idSubdistrict, setIdSubdistrict] = useState("");
    const [idDistrict, setIdDistrict] = useState("");
    const [idProvince, setIdProvince] = useState("");
    const [idZip, setIdZip] = useState("");

    const [curOrg, setCurOrg] = useState("");
    const [curNo, setCurNo] = useState("");
    const [curVillage, setCurVillage] = useState("");
    const [curMoo, setCurMoo] = useState("");
    const [curAlley, setCurAlley] = useState("");
    const [curRoad, setCurRoad] = useState("");
    const [curSubdistrict, setCurSubdistrict] = useState("");
    const [curDistrict, setCurDistrict] = useState("");
    const [curProvince, setCurProvince] = useState("");
    const [curZip, setCurZip] = useState("");
    const [curCountry, setCurCountry] = useState("ไทย");
    const [curPhone, setCurPhone] = useState("");
    const [mobile, setMobile] = useState("");
    const [email, setEmail] = useState("");
    const [lineId, setLineId] = useState("");
    const [noLineId, setNoLineId] = useState(false);

    const [workOrg, setWorkOrg] = useState("");
    const [notWorking, setNotWorking] = useState(false);
    const [workNo, setWorkNo] = useState("");
    const [workVillage, setWorkVillage] = useState("");
    const [workMoo, setWorkMoo] = useState("");
    const [workAlley, setWorkAlley] = useState("");
    const [workRoad, setWorkRoad] = useState("");
    const [workSubdistrict, setWorkSubdistrict] = useState("");
    const [workDistrict, setWorkDistrict] = useState("");
    const [workProvince, setWorkProvince] = useState("");
    const [workZip, setWorkZip] = useState("");
    const [workPhone, setWorkPhone] = useState("");

    const buildingHint = 'ถ้ามี ให้ระบุคำว่า "หมู่บ้าน" "คอนโด" หรือ "อาคาร" ด้วย';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        Swal.fire({
            title: "บันทึกข้อมูลสำเร็จ",
            text: "ข้อมูลส่วนตัวของคุณได้รับการอัปเดตเรียบร้อยแล้ว",
            icon: "success",
            confirmButtonText: "ตกลง",
            confirmButtonColor: "#737300",
        }).then(() => {
            router.push("/profile");
        });
    };

    return (
        <div className={`${styles.pageWrapper} ThaiFont`}>
            <header className={styles.banner}>
                <div className={styles.bannerOverlay}>
                    <div className={styles.bannerContent}>
                        <h1 className={`${styles.bannerTitle} ThaiFont`}>จัดการข้อมูลส่วนตัว</h1>
                        <p className={`${styles.bannerSubtitle} ThaiFont`}>
                            แก้ไขข้อมูลเภสัชกรของคุณ
                        </p>
                    </div>
                </div>
            </header>

            <main className={styles.contentBody}>
                <div className={styles.pageHeader}>
                    <Link href="/profile" className={styles.backBtn}>
                        <ChevronLeft size={18} />
                        <span>ย้อนกลับ</span>
                    </Link>
                </div>

                <form className={styles.formCard} onSubmit={handleSubmit}>
                    <div className={styles.licenseBar}>
                        <div>
                            <span className={styles.licenseLabel}>เลขใบอนุญาต</span>
                            <strong className={styles.licenseValue}>{userId || "-"}</strong>
                        </div>
                        <div>
                            <span className={styles.licenseLabel}>ชื่อผู้ใช้</span>
                            <strong className={styles.licenseValue}>{userName || "-"}</strong>
                        </div>
                    </div>

                    <Section
                        title="ข้อมูลผู้ประกอบวิชาชีพเภสัชกรรม"
                        description="ข้อมูลภาษาไทยบางส่วนเป็นข้อมูลจากระบบ อ่านได้อย่างเดียว"
                    >
                        <Row>
                            <Field label="คำนำหน้า (TH)">
                                <input className={`${styles.input} ${styles.readOnly}`} value="" readOnly placeholder="—" />
                            </Field>
                            <Field label="ชื่อ (TH)">
                                <input className={`${styles.input} ${styles.readOnly}`} value="" readOnly placeholder="—" />
                            </Field>
                            <Field label="นามสกุล (TH)">
                                <input className={`${styles.input} ${styles.readOnly}`} value="" readOnly placeholder="—" />
                            </Field>
                        </Row>

                        <Row>
                            <Field label="คำนำหน้า (EN)" required>
                                <select
                                    className={styles.select}
                                    value={prefixEn}
                                    onChange={(e) => setPrefixEn(e.target.value)}
                                >
                                    <option value="">เลือก</option>
                                    <option>Mr.</option>
                                    <option>Mrs.</option>
                                    <option>Miss</option>
                                    <option>Ms.</option>
                                </select>
                            </Field>
                            <Field label="ชื่อ (EN)" required>
                                <input
                                    className={styles.input}
                                    value={firstNameEn}
                                    onChange={(e) => setFirstNameEn(e.target.value)}
                                    placeholder="First name"
                                />
                            </Field>
                            <Field label="นามสกุล (EN)" required>
                                <input
                                    className={styles.input}
                                    value={lastNameEn}
                                    onChange={(e) => setLastNameEn(e.target.value)}
                                    placeholder="Last name"
                                />
                            </Field>
                        </Row>

                        <Row>
                            <Field label="เลขบัตรประชาชน">
                                <input className={`${styles.input} ${styles.readOnly}`} value="" readOnly placeholder="—" />
                            </Field>
                            <Field label="วันเดือนปีเกิด (พ.ศ.)">
                                <input className={`${styles.input} ${styles.readOnly}`} value="" readOnly placeholder="—" />
                            </Field>
                            <Field label="อายุ" suffix="ปี">
                                <input className={`${styles.input} ${styles.readOnly}`} value="" readOnly placeholder="—" />
                            </Field>
                        </Row>

                        <Row>
                            <Field label="สัญชาติ">
                                <input className={`${styles.input} ${styles.readOnly}`} value="" readOnly placeholder="—" />
                            </Field>
                            <Field label="เชื้อชาติ">
                                <input
                                    className={styles.input}
                                    value={race}
                                    onChange={(e) => setRace(e.target.value)}
                                    placeholder="ระบุเชื้อชาติ"
                                />
                            </Field>
                            <div className={styles.fieldSpacer} />
                        </Row>

                        <Row>
                            <Field label="สำเร็จการศึกษาจาก">
                                <input className={`${styles.input} ${styles.readOnly}`} value="" readOnly placeholder="—" />
                            </Field>
                            <Field label="ปีการศึกษาที่จบ">
                                <input className={`${styles.input} ${styles.readOnly}`} value="" readOnly placeholder="—" />
                            </Field>
                            <Field label="วันที่จบการศึกษา">
                                <input className={`${styles.input} ${styles.readOnly}`} value="" readOnly placeholder="—" />
                            </Field>
                        </Row>

                        <Row>
                            <Field label="สาขาปฏิบัติงานหลัก" required>
                                <select
                                    className={styles.select}
                                    value={mainPractice}
                                    onChange={(e) => setMainPractice(e.target.value)}
                                >
                                    <option value="">เลือกสาขา</option>
                                    <option>ไม่ได้ปฏิบัติงาน</option>
                                    <option>เภสัชกรรมชุมชน</option>
                                    <option>เภสัชกรรมโรงพยาบาล</option>
                                    <option>อุตสาหกรรมยา</option>
                                    <option>การศึกษา</option>
                                </select>
                            </Field>
                            <Field label="สาขาปฏิบัติงานรอง">
                                <select
                                    className={styles.select}
                                    value={subPractice}
                                    onChange={(e) => setSubPractice(e.target.value)}
                                >
                                    <option value="">เลือกสาขา</option>
                                    <option>ไม่ได้ปฏิบัติงาน</option>
                                    <option>เภสัชกรรมชุมชน</option>
                                    <option>เภสัชกรรมโรงพยาบาล</option>
                                    <option>อุตสาหกรรมยา</option>
                                    <option>การศึกษา</option>
                                </select>
                            </Field>
                            <Field label="วิธีการรับข่าวสาร">
                                <select
                                    className={styles.select}
                                    value={newsChannel}
                                    onChange={(e) => setNewsChannel(e.target.value)}
                                >
                                    <option value="">เลือกช่องทาง</option>
                                    <option>ไปรษณีย์</option>
                                    <option>อีเมล</option>
                                    <option>SMS</option>
                                </select>
                            </Field>
                        </Row>
                    </Section>

                    <Section title="ที่อยู่ตามบัตรประชาชน">
                        <Row>
                            <Field label="เลขที่" required>
                                <input
                                    className={styles.input}
                                    value={idNo}
                                    onChange={(e) => setIdNo(e.target.value)}
                                    placeholder="เลขที่"
                                />
                            </Field>
                            <Field label="หมู่บ้าน/อาคาร" hint={buildingHint}>
                                <input
                                    className={styles.input}
                                    value={idVillage}
                                    onChange={(e) => setIdVillage(e.target.value)}
                                    placeholder="หมู่บ้าน / คอนโด / อาคาร"
                                />
                            </Field>
                            <Field label="หมู่ที่">
                                <input
                                    className={styles.input}
                                    value={idMoo}
                                    onChange={(e) => setIdMoo(e.target.value)}
                                    placeholder="หมู่ที่"
                                />
                            </Field>
                        </Row>

                        <Row>
                            <Field label="ตรอก/ซอย">
                                <input
                                    className={styles.input}
                                    value={idAlley}
                                    onChange={(e) => setIdAlley(e.target.value)}
                                    placeholder="ตรอก / ซอย"
                                />
                            </Field>
                            <Field label="ถนน">
                                <input
                                    className={styles.input}
                                    value={idRoad}
                                    onChange={(e) => setIdRoad(e.target.value)}
                                    placeholder="ถนน"
                                />
                            </Field>
                            <Field label="ตำบล/แขวง" required>
                                <input
                                    className={styles.input}
                                    value={idSubdistrict}
                                    onChange={(e) => setIdSubdistrict(e.target.value)}
                                    placeholder="ตำบล / แขวง"
                                />
                            </Field>
                        </Row>

                        <Row>
                            <Field label="อำเภอ/เขต" required>
                                <input
                                    className={styles.input}
                                    value={idDistrict}
                                    onChange={(e) => setIdDistrict(e.target.value)}
                                    placeholder="อำเภอ / เขต"
                                />
                            </Field>
                            <Field label="จังหวัด" required>
                                <input
                                    className={styles.input}
                                    value={idProvince}
                                    onChange={(e) => setIdProvince(e.target.value)}
                                    placeholder="จังหวัด"
                                />
                            </Field>
                            <Field label="รหัสไปรษณีย์">
                                <input
                                    className={styles.input}
                                    value={idZip}
                                    onChange={(e) => setIdZip(e.target.value)}
                                    placeholder="รหัสไปรษณีย์"
                                />
                            </Field>
                        </Row>
                    </Section>

                    <Section title="ที่อยู่ปัจจุบัน / ที่อยู่ติดต่อได้">
                        <Row>
                            <Field label="ชื่อหน่วยงาน" wide>
                                <input
                                    className={styles.input}
                                    value={curOrg}
                                    onChange={(e) => setCurOrg(e.target.value)}
                                    placeholder="ชื่อหน่วยงาน (ถ้ามี)"
                                />
                            </Field>
                        </Row>

                        <Row>
                            <Field label="เลขที่" required>
                                <input
                                    className={styles.input}
                                    value={curNo}
                                    onChange={(e) => setCurNo(e.target.value)}
                                    placeholder="เลขที่"
                                />
                            </Field>
                            <Field label="หมู่บ้าน/อาคาร" hint={buildingHint}>
                                <input
                                    className={styles.input}
                                    value={curVillage}
                                    onChange={(e) => setCurVillage(e.target.value)}
                                    placeholder="หมู่บ้าน / คอนโด / อาคาร"
                                />
                            </Field>
                            <Field label="หมู่ที่">
                                <input
                                    className={styles.input}
                                    value={curMoo}
                                    onChange={(e) => setCurMoo(e.target.value)}
                                    placeholder="หมู่ที่"
                                />
                            </Field>
                        </Row>

                        <Row>
                            <Field label="ตรอก/ซอย">
                                <input
                                    className={styles.input}
                                    value={curAlley}
                                    onChange={(e) => setCurAlley(e.target.value)}
                                    placeholder="ตรอก / ซอย"
                                />
                            </Field>
                            <Field label="ถนน" required>
                                <input
                                    className={styles.input}
                                    value={curRoad}
                                    onChange={(e) => setCurRoad(e.target.value)}
                                    placeholder="ถนน"
                                />
                            </Field>
                            <Field label="ตำบล/แขวง" required>
                                <input
                                    className={styles.input}
                                    value={curSubdistrict}
                                    onChange={(e) => setCurSubdistrict(e.target.value)}
                                    placeholder="ตำบล / แขวง"
                                />
                            </Field>
                        </Row>

                        <Row>
                            <Field label="อำเภอ/เขต" required>
                                <input
                                    className={styles.input}
                                    value={curDistrict}
                                    onChange={(e) => setCurDistrict(e.target.value)}
                                    placeholder="อำเภอ / เขต"
                                />
                            </Field>
                            <Field label="จังหวัด" required>
                                <select
                                    className={styles.select}
                                    value={curProvince}
                                    onChange={(e) => setCurProvince(e.target.value)}
                                >
                                    <option value="">เลือกจังหวัด</option>
                                    <option>กรุงเทพมหานคร</option>
                                    <option>นนทบุรี</option>
                                    <option>ปทุมธานี</option>
                                    <option>นครราชสีมา</option>
                                </select>
                            </Field>
                            <Field label="รหัสไปรษณีย์" required>
                                <input
                                    className={styles.input}
                                    value={curZip}
                                    onChange={(e) => setCurZip(e.target.value)}
                                    placeholder="รหัสไปรษณีย์"
                                />
                            </Field>
                        </Row>

                        <Row>
                            <Field label="ประเทศ">
                                <input
                                    className={styles.input}
                                    value={curCountry}
                                    onChange={(e) => setCurCountry(e.target.value)}
                                    placeholder="ประเทศ"
                                />
                            </Field>
                            <Field label="โทรศัพท์">
                                <input
                                    className={styles.input}
                                    value={curPhone}
                                    onChange={(e) => setCurPhone(e.target.value)}
                                    placeholder="เบอร์โทรศัพท์"
                                />
                            </Field>
                            <div className={styles.fieldSpacer} />
                        </Row>

                        <Row>
                            <Field label="มือถือ" required>
                                <input
                                    className={styles.input}
                                    value={mobile}
                                    onChange={(e) => setMobile(e.target.value)}
                                    placeholder="เบอร์มือถือ"
                                />
                            </Field>
                            <Field label="E-mail" required>
                                <input
                                    className={styles.input}
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                />
                            </Field>
                            <Field label="Line ID" required>
                                <div className={styles.stackControl}>
                                    <input
                                        className={styles.input}
                                        value={lineId}
                                        onChange={(e) => setLineId(e.target.value)}
                                        disabled={noLineId}
                                        placeholder="Line ID"
                                    />
                                    <label className={styles.checkLabel}>
                                        <input
                                            type="checkbox"
                                            checked={noLineId}
                                            onChange={(e) => setNoLineId(e.target.checked)}
                                        />
                                        ไม่ระบุ / ไม่มี Line ID
                                    </label>
                                </div>
                            </Field>
                        </Row>
                    </Section>

                    <Section title="สถานที่ปฏิบัติงานปัจจุบัน">
                        <Row>
                            <Field label="ชื่อหน่วยงาน" wide required>
                                <div className={styles.orgRow}>
                                    <input
                                        className={styles.input}
                                        value={workOrg}
                                        onChange={(e) => setWorkOrg(e.target.value)}
                                        disabled={notWorking}
                                        placeholder="ชื่อหน่วยงาน"
                                    />
                                    <label className={styles.checkChip}>
                                        <input
                                            type="checkbox"
                                            checked={notWorking}
                                            onChange={(e) => setNotWorking(e.target.checked)}
                                        />
                                        ไม่ได้ปฏิบัติงาน
                                    </label>
                                </div>
                            </Field>
                        </Row>

                        <Row>
                            <Field label="เลขที่" required>
                                <input
                                    className={styles.input}
                                    value={workNo}
                                    onChange={(e) => setWorkNo(e.target.value)}
                                    disabled={notWorking}
                                    placeholder="เลขที่"
                                />
                            </Field>
                            <Field label="หมู่บ้าน/อาคาร" hint={buildingHint}>
                                <input
                                    className={styles.input}
                                    value={workVillage}
                                    onChange={(e) => setWorkVillage(e.target.value)}
                                    disabled={notWorking}
                                    placeholder="หมู่บ้าน / คอนโด / อาคาร"
                                />
                            </Field>
                            <Field label="หมู่ที่">
                                <input
                                    className={styles.input}
                                    value={workMoo}
                                    onChange={(e) => setWorkMoo(e.target.value)}
                                    disabled={notWorking}
                                    placeholder="หมู่ที่"
                                />
                            </Field>
                        </Row>

                        <Row>
                            <Field label="ตรอก/ซอย">
                                <input
                                    className={styles.input}
                                    value={workAlley}
                                    onChange={(e) => setWorkAlley(e.target.value)}
                                    disabled={notWorking}
                                    placeholder="ตรอก / ซอย"
                                />
                            </Field>
                            <Field label="ถนน" required>
                                <input
                                    className={styles.input}
                                    value={workRoad}
                                    onChange={(e) => setWorkRoad(e.target.value)}
                                    disabled={notWorking}
                                    placeholder="ถนน"
                                />
                            </Field>
                            <Field label="ตำบล/แขวง" required>
                                <input
                                    className={styles.input}
                                    value={workSubdistrict}
                                    onChange={(e) => setWorkSubdistrict(e.target.value)}
                                    disabled={notWorking}
                                    placeholder="ตำบล / แขวง"
                                />
                            </Field>
                        </Row>

                        <Row>
                            <Field label="อำเภอ/เขต" required>
                                <input
                                    className={styles.input}
                                    value={workDistrict}
                                    onChange={(e) => setWorkDistrict(e.target.value)}
                                    disabled={notWorking}
                                    placeholder="อำเภอ / เขต"
                                />
                            </Field>
                            <Field label="จังหวัด" required>
                                <select
                                    className={styles.select}
                                    value={workProvince}
                                    onChange={(e) => setWorkProvince(e.target.value)}
                                    disabled={notWorking}
                                >
                                    <option value="">เลือกจังหวัด</option>
                                    <option>กรุงเทพมหานคร</option>
                                    <option>นนทบุรี</option>
                                    <option>ปทุมธานี</option>
                                    <option>นครราชสีมา</option>
                                </select>
                            </Field>
                            <Field label="รหัสไปรษณีย์" required>
                                <input
                                    className={styles.input}
                                    value={workZip}
                                    onChange={(e) => setWorkZip(e.target.value)}
                                    disabled={notWorking}
                                    placeholder="รหัสไปรษณีย์"
                                />
                            </Field>
                        </Row>

                        <Row>
                            <Field label="โทรศัพท์">
                                <input
                                    className={styles.input}
                                    value={workPhone}
                                    onChange={(e) => setWorkPhone(e.target.value)}
                                    disabled={notWorking}
                                    placeholder="เบอร์โทรศัพท์"
                                />
                            </Field>
                            <div className={styles.fieldSpacer} />
                            <div className={styles.fieldSpacer} />
                        </Row>
                    </Section>

                    <div className={styles.actionRow}>
                        <Link href="/profile" className={styles.cancelBtn}>
                            ยกเลิก
                        </Link>
                        <button type="submit" className={styles.saveBtn}>
                            <Save size={18} />
                            บันทึกข้อมูล
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
}

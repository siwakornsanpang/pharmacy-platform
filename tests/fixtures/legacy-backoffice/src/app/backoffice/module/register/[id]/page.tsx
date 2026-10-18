"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, User, CreditCard, MapPin, Briefcase, Calendar, ShieldCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import styles from "../register.module.css";
import { authFetch } from "@/app/utils/authFetch";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Pharmacist = {
    id: string;
    title: string;
    firstName: string;
    lastName: string;
    licenseNumber: string;
    province: string;
    status: string;
    idCardNumber: string;
    idCardAddress: string;
    contactAddress: string;
    workplace: string;
    expiryDate: string;
    imageUrl: string;
    requestNumber?: string;
    startDate?: string;
    endDate?: string;
    cpePoints?: string;
    birthDate?: string;
};

export default function RegisterDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [pharmacist, setPharmacist] = useState<Pharmacist | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPharmacist = async () => {
            if (!params.id) return;

            try {
                setIsLoading(true);
                const res = await authFetch(`${API_URL}/pharmacists/${params.id}`);
                if (!res.ok) throw new Error("ไม่สามารถโหลดข้อมูลเภสัชกรได้");

                const data = await res.json();

                // Mapped data from API
                const cleanName = (data.name || "")
                    .replace("ภก.", "")
                    .replace("ภญ.", "")
                    .trim();
                const parts = cleanName.split(" ");

                setPharmacist({
                    id: String(data.id),
                    title: data.title || (data.name?.includes("ภญ") ? "ภญ." : "ภก."),
                    firstName: parts[0] || "",
                    lastName: parts.slice(1).join(" ") || "",
                    licenseNumber: data.registrationId || "-",
                    province: data.province || "-",
                    status: data.status || "-",
                    idCardNumber: data.idCardNumber || "-",
                    idCardAddress: data.idCardAddress || "-",
                    contactAddress: data.contactAddress || data.address || "-",
                    workplace: data.workplace || "-",
                    expiryDate: data.expiryDate || "-",
                    imageUrl: data.imageUrl || "",
                    requestNumber: data.requestNumber || "-",
                    startDate: data.startDate || "-",
                    endDate: data.expiryDate || data.endDate || "-",
                    cpePoints: data.cpePoints || "0.00",
                    birthDate: data.birthDate || "-"
                });
            } catch (err: any) {
                console.error(err);
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPharmacist();
    }, [params.id]);

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <Loader2 size={40} className={styles.spinner} />
                <p>กำลังโหลดข้อมูล...</p>
            </div>
        );
    }

    if (error || !pharmacist) {
        return (
            <div className={styles.errorContainer}>
                <p>⚠️ {error || "ไม่พบข้อมูลเภสัชกร"}</p>
                <button onClick={() => router.back()} className={styles.backButton}>
                    กลับไปหน้ารายการ
                </button>
            </div>
        );
    }

    return (
        <div className={styles.detailPageContainer}>
            {/* Header / Breadcrumb */}
            <div className={styles.detailHeader}>
                <button onClick={() => router.back()} className={styles.backLink}>
                    <ChevronLeft size={20} />
                    <span>กลับไปหน้ารายการ</span>
                </button>
                <h1 className={styles.detailPageTitle}>ข้อมูลเภสัชกร</h1>
            </div>

            <div className={styles.dashboardLayout}>
                {/* 1. Photo Box */}
                <div className={`${styles.dashboardBox} ${styles.photoBox}`}>
                    <div className={styles.photoContainer}>
                        {pharmacist.imageUrl ? (
                            <img src={pharmacist.imageUrl} alt="รูปภาพเภสัชกร" className={styles.dashboardPhoto} />
                        ) : (
                            <div className={styles.dashboardPhotoPlaceholder}>
                                <User size={80} />
                                <span>รูปภาพเภสัชกร</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. General Info Box */}
                <div className={`${styles.dashboardBox} ${styles.generalInfoBox}`}>
                    <h3 className={styles.boxTitle}>ข้อมูลทั่วไป</h3>
                    <div className={styles.boxContent}>
                        <div className={styles.fieldRow}>
                            <span className={styles.fieldLabel}>ชื่อ-นามสกุล :</span>
                            <span className={styles.fieldValue}>{pharmacist.title} {pharmacist.firstName} {pharmacist.lastName}</span>
                        </div>
                        <div className={styles.fieldRow}>
                            <span className={styles.fieldLabel}>เลขทะเบียน :</span>
                            <span className={styles.fieldValue}>{pharmacist.licenseNumber}</span>
                        </div>
                        <div className={styles.fieldRow}>
                            <span className={styles.fieldLabel}>จังหวัด :</span>
                            <span className={styles.fieldValue}>{pharmacist.province}</span>
                        </div>
                        <div className={styles.fieldRow}>
                            <span className={styles.fieldLabel}>ที่ทำงาน :</span>
                            <span className={styles.fieldValue}>{pharmacist.workplace}</span>
                        </div>
                    </div>
                </div>

                {/* 3. Personal Info Box */}
                <div className={`${styles.dashboardBox} ${styles.personalInfoBox}`}>
                    <h3 className={styles.boxTitle}>ข้อมูลส่วนตัว</h3>
                    <div className={styles.boxContent}>
                        <div className={styles.fieldRow}>
                            <span className={styles.fieldLabel}>เลขบัตรประชาชน :</span>
                            <span className={styles.fieldValue}>{pharmacist.idCardNumber}</span>
                        </div>
                        <div className={styles.fieldRow}>
                            <span className={styles.fieldLabel}>วันเกิด :</span>
                            <span className={styles.fieldValue}>{pharmacist.birthDate}</span>
                        </div>
                        <div className={styles.fieldRow}>
                            <span className={styles.fieldLabel}>ที่อยู่ :</span>
                            <span className={styles.fieldValue}>{pharmacist.contactAddress}</span>
                        </div>
                    </div>
                </div>

                {/* 4. License Info Box */}
                <div className={`${styles.dashboardBox} ${styles.licenseInfoBoxDashboard}`}>
                    <div className={styles.licenseBoxHeader}>
                        <h3 className={styles.boxTitle}>ข้อมูลใบประกอบวิชาชีพ</h3>
                        <div className={`${styles.statusBadgeLarge} ${pharmacist.status === "ใช้งาน" ? styles.statusActive : styles.statusInactive
                            }`}>
                            สถานะ : {pharmacist.status}
                        </div>
                    </div>
                    <div className={styles.boxContent}>
                        <div style={{ marginBottom: "1.5rem" }} className={styles.fieldRow}>
                            <span className={styles.fieldLabel}>เลขที่คำร้องขอ :</span>
                            <span className={styles.fieldValue}>{pharmacist.requestNumber}</span>
                        </div>
                        <div className={styles.licenseDatesGrid}>
                            <div className={styles.dateItem}>
                                <label>ปีที่เริ่ม</label>
                                <p>{pharmacist.startDate}</p>
                            </div>
                            <div className={styles.dateItem}>
                                <label>หมดอายุ</label>
                                <p>{pharmacist.endDate}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. CPE Info Box */}
                <div className={`${styles.dashboardBox} ${styles.cpeInfoBox}`}>
                    <h3 className={styles.boxTitle}>ข้อมูล CPE ของเภสัชกร</h3>
                    <div className={styles.cpeContent}>
                        <div className={styles.cpeScoreLarge}>
                            <span className={styles.cpeScoreLabel}>คะแนนสะสมปัจจุบัน</span>
                            <span className={styles.cpeScoreText}>{pharmacist.cpePoints}</span>
                        </div>
                        <div className={styles.cpeStatusRow}>
                            <ShieldCheck size={20} className={styles.cpeIcon} />
                            <span>สถานะการเก็บคะแนน: ปกติ</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

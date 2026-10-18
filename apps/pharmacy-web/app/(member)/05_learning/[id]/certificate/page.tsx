"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import styles from "./certificate.module.css";
import { getCertificate } from "@/features/academy/api";
import { academyErrorMessage } from "@/features/academy/mapping";
import type { AcademyCertificate } from "@/features/academy/mapping";

export default function AcademyCertificatePage() {
  const params = useParams<{ id: string }>();
  const [certificate, setCertificate] = useState<AcademyCertificate | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    getCertificate(params.id, controller.signal).then(setCertificate).catch((error) => {
      if (controller.signal.aborted) return;
      setMessage(academyErrorMessage(error, "ยังรับใบประกาศไม่ได้"));
    });
    return () => controller.abort();
  }, [params.id]);

  if (!certificate) return <p className={styles.message}>{message || "กำลังโหลดใบประกาศ"}</p>;

  return (
    <main className={styles.page}>
      <article className={styles.sheet}>
        <p>สภาเภสัชกรรม</p>
        <h1>ใบประกาศนียบัตร</h1>
        <p>ขอมอบให้</p>
        <h2>{certificate.learnerName || certificate.pharmacistLicense}</h2>
        <p>เลขใบอนุญาต {certificate.pharmacistLicense}</p>
        <p>ผ่านการเรียนรู้</p>
        <h2>{certificate.courseTitle}</h2>
        <p>{Number(certificate.cpeCredits || 0)} หน่วยกิต CPE</p>
        {certificate.conferenceCode && <p>Conference Code {certificate.conferenceCode}</p>}
        <p>เลขที่ {certificate.code}</p>
      </article>
      <button className={styles.print} type="button" onClick={() => window.print()}>พิมพ์</button>
    </main>
  );
}

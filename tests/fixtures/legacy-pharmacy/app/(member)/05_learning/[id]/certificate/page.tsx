"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import styles from "./certificate.module.css";

type Certificate = {
  code: string;
  issuedAt: string;
  learnerName: string | null;
  pharmacistLicense: string;
  courseTitle: string;
  cpeCredits: string | null;
  conferenceCode: string | null;
};

export default function AcademyCertificatePage() {
  const params = useParams<{ id: string }>();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch(`/api/academy/courses/${params.id}/certificate`).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || "ยังรับใบประกาศไม่ได้");
        return;
      }
      setCertificate(data);
    });
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

"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/app/utils/authFetch";
import styles from "../academy.module.css";

const API = process.env.NEXT_PUBLIC_API_URL;

type Row = {
  pharmacistLicense: string;
  displayName: string | null;
  courseTitle: string;
  cpeCredits: string | null;
  conferenceCode: string | null;
};

export default function AcademyCpePage() {
  const [items, setItems] = useState<Row[]>([]);

  useEffect(() => {
    authFetch(`${API}/academy/admin/cpe`).then(async (res) => {
      if (res.ok) setItems(await res.json());
    });
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>รายงาน CPE</h1>
          <p className={styles.subtitle}>ผู้เรียนที่เรียนจบคอร์สแล้ว พร้อม Conference Code</p>
        </div>
      </div>
      <table className={styles.table}>
        <thead><tr><th>เลขใบอนุญาต</th><th>ชื่อ</th><th>คอร์ส</th><th>หน่วยกิต</th><th>Conference Code</th></tr></thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={5} className={styles.empty}>ยังไม่มีผู้เรียนจบ</td></tr>}
          {items.map((item) => (
            <tr key={`${item.pharmacistLicense}-${item.courseTitle}`}>
              <td>{item.pharmacistLicense}</td>
              <td>{item.displayName || "—"}</td>
              <td>{item.courseTitle}</td>
              <td>{item.cpeCredits || "0"}</td>
              <td>{item.conferenceCode || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

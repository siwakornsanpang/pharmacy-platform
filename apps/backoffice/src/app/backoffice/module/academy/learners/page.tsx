"use client";

import { useEffect, useState } from "react";
import { listEnrollments } from "@/features/academy/api";
import styles from "../academy.module.css";
const PAGE_SIZE = 20;

type Enrollment = {
  id: number;
  courseTitle: string;
  pharmacistLicense: string;
  displayName: string | null;
  status: string;
  progressPercent: number;
  examPassed: boolean;
  enrolledAt: string | null;
};

const STATUS_LABEL: Record<string, string> = { active: "กำลังเรียน", cancelled: "ยกเลิก" };

export default function AcademyLearnersPage() {
  const [items, setItems] = useState<Enrollment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = q.trim();
      setQuery((current) => {
        if (current !== next) setPage(1);
        return next;
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    const controller = new AbortController();
    listEnrollments({ page, pageSize: PAGE_SIZE, q: query, status }, controller.signal)
      .then((data) => { setItems(data.items); setTotal(data.total); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [query, status, page]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const filtering = Boolean(query || status);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>ผู้เรียน</h1>
          <p className={styles.subtitle}>ค้นหาจากชื่อ เลขใบอนุญาต หรือชื่อคอร์ส แสดงทีละ {PAGE_SIZE} รายการ</p>
        </div>
      </div>
      <div className={styles.toolbar}>
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="ค้นหาชื่อ เลขใบอนุญาต หรือคอร์ส" />
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">ทุกสถานะ</option>
          <option value="active">กำลังเรียน</option>
          <option value="cancelled">ยกเลิก</option>
        </select>
      </div>
      <table className={styles.table}>
        <thead>
          <tr><th>คอร์ส</th><th>ชื่อ</th><th>เลขใบอนุญาต</th><th>ความคืบหน้า</th><th>สถานะ</th></tr>
        </thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={5} className={styles.empty}>{filtering ? "ไม่พบรายการที่ค้นหา" : "ยังไม่มีผู้เรียน"}</td></tr>}
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.courseTitle}</td>
              <td>{item.displayName || "—"}</td>
              <td>{item.pharmacistLicense}</td>
              <td>{item.progressPercent}%{item.examPassed ? " · สอบผ่าน" : ""}</td>
              <td>{STATUS_LABEL[item.status] || item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.pager}>
        <span>แสดง {from.toLocaleString()}–{to.toLocaleString()} จาก {total.toLocaleString()}</span>
        <div className={styles.actions}>
          <button className={styles.ghost} type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>ก่อนหน้า</button>
          <button className={styles.ghost} type="button" disabled={page >= pages} onClick={() => setPage(page + 1)}>ถัดไป</button>
        </div>
      </div>
    </div>
  );
}

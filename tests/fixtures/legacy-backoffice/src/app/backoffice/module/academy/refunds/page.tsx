"use client";

import { useEffect, useState } from "react";
import { authFetch } from "@/app/utils/authFetch";
import styles from "../academy.module.css";

const API = process.env.NEXT_PUBLIC_API_URL;

type Refund = {
  id: number;
  courseTitle: string;
  displayName: string | null;
  pharmacistLicense: string;
  amount: string;
  reason: string;
  status: string;
};

const STATUS_LABEL: Record<string, string> = { pending: "รอตรวจ", approved: "คืนเงินแล้ว", rejected: "ปฏิเสธ" };

export default function AcademyRefundsPage() {
  const [items, setItems] = useState<Refund[]>([]);

  const load = async () => {
    const res = await authFetch(`${API}/academy/admin/refunds`);
    if (res.ok) setItems(await res.json());
  };

  useEffect(() => { load(); }, []);

  const act = async (id: number, action: "approve" | "reject") => {
    await authFetch(`${API}/academy/admin/refunds/${id}/${action}`, { method: "POST", body: "{}" });
    load();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>คำขอคืนเงิน</h1>
          <p className={styles.subtitle}>อนุมัติได้เมื่อผู้เรียนยังเรียนไม่จบ</p>
        </div>
      </div>
      <table className={styles.table}>
        <thead><tr><th>คอร์ส</th><th>ผู้เรียน</th><th>เหตุผล</th><th>สถานะ</th><th></th></tr></thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={5} className={styles.empty}>ยังไม่มีคำขอ</td></tr>}
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.courseTitle}</td>
              <td>{item.displayName || item.pharmacistLicense}</td>
              <td>{item.reason}</td>
              <td>{STATUS_LABEL[item.status] || item.status}</td>
              <td className={styles.actions}>
                {item.status === "pending" && (
                  <>
                    <button className={styles.primary} type="button" onClick={() => act(item.id, "approve")}>อนุมัติ</button>
                    <button className={styles.danger} type="button" onClick={() => act(item.id, "reject")}>ปฏิเสธ</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

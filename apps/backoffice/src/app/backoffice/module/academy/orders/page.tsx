"use client";

import { useEffect, useState } from "react";
import styles from "../academy.module.css";
import { listOrders, reviewOrder } from "@/features/academy/api";
import type { AcademyOrder } from "@/features/academy/mapping";

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<string, string> = {
  pending: "รอตรวจ",
  paid: "ชำระแล้ว",
  rejected: "ปฏิเสธ",
  refunded: "คืนเงินแล้ว",
};

export default function AcademyOrdersPage() {
  const [items, setItems] = useState<AcademyOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

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
    listOrders({ page, pageSize: PAGE_SIZE, q: query, status }, controller.signal)
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [query, status, page, reloadKey]);

  const act = async (id: number, action: "approve" | "reject") => {
    try {
      await reviewOrder(id, action);
      setReloadKey((value) => value + 1);
    } catch {
      return;
    }
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const filtering = Boolean(query || status);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>การชำระเงิน</h1>
          <p className={styles.subtitle}>ค้นหาจากชื่อ เลขใบอนุญาต หรือชื่อคอร์ส แสดงทีละ {PAGE_SIZE} รายการ</p>
        </div>
      </div>
      <div className={styles.toolbar}>
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="ค้นหาชื่อ เลขใบอนุญาต หรือคอร์ส" />
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>
          <option value="">ทุกสถานะ</option>
          <option value="pending">รอตรวจ</option>
          <option value="paid">ชำระแล้ว</option>
          <option value="rejected">ปฏิเสธ</option>
          <option value="refunded">คืนเงินแล้ว</option>
        </select>
      </div>
      <table className={styles.table}>
        <thead><tr><th>คอร์ส</th><th>ผู้เรียน</th><th>จำนวนเงิน</th><th>สลิป</th><th>สถานะ</th><th></th></tr></thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={6} className={styles.empty}>{filtering ? "ไม่พบรายการที่ค้นหา" : "ยังไม่มีรายการ"}</td></tr>}
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.courseTitle}</td>
              <td>{item.displayName || item.pharmacistLicense}</td>
              <td>{Number(item.amount).toLocaleString()}</td>
              <td>{item.slipUrl ? <a href={item.slipUrl} target="_blank" rel="noreferrer">ดูสลิป</a> : "—"}</td>
              <td>{STATUS_LABEL[item.status] || item.status}</td>
              <td className={styles.actions}>
                {item.status === "pending" && (
                  <>
                    <button className={styles.primary} type="button" onClick={() => act(item.id, "approve")}>ยืนยัน</button>
                    <button className={styles.danger} type="button" onClick={() => act(item.id, "reject")}>ปฏิเสธ</button>
                  </>
                )}
              </td>
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

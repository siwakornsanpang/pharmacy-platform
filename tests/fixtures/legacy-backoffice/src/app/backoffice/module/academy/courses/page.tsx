"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Swal from "sweetalert2";
import { authFetch } from "@/app/utils/authFetch";
import styles from "../academy.module.css";

const API = process.env.NEXT_PUBLIC_API_URL;

type Course = {
  id: number;
  title: string;
  status: "draft" | "published" | "archived";
  isFeatured: boolean;
  categoryName: string | null;
  instructorName: string | null;
  cpeCredits: string | null;
};

const STATUS_LABEL = { draft: "ร่าง", published: "เผยแพร่", archived: "เก็บถาวร" };

export default function AcademyCoursesPage() {
  const [items, setItems] = useState<Course[]>([]);
  const [status, setStatus] = useState<"all" | Course["status"]>("all");

  const load = async () => {
    const res = await authFetch(`${API}/academy/admin/courses`);
    if (res.ok) setItems(await res.json());
  };

  useEffect(() => { load(); }, []);

  const remove = async (item: Course) => {
    const confirmed = await Swal.fire({ title: `ลบ ${item.title}?`, showCancelButton: true, confirmButtonText: "ลบ" });
    if (!confirmed.isConfirmed) return;
    await authFetch(`${API}/academy/admin/courses/${item.id}`, { method: "DELETE" });
    load();
  };

  const visible = items.filter((item) => status === "all" || item.status === status);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>คอร์สเรียน</h1>
          <p className={styles.subtitle}>เฉพาะสถานะเผยแพร่จะไปแสดงบนหน้า Academy</p>
        </div>
        <div className={styles.actions}>
          <Link href="/backoffice/module/academy/courses/new" className={styles.primary}>เพิ่มคอร์ส</Link>
        </div>
      </div>
      <div className={styles.actions} style={{ marginBottom: "1rem" }}>
        {(["all", "draft", "published", "archived"] as const).map((key) => (
          <button key={key} className={status === key ? styles.primary : styles.ghost} type="button" onClick={() => setStatus(key)}>
            {key === "all" ? "ทั้งหมด" : STATUS_LABEL[key]}
          </button>
        ))}
      </div>
      <table className={styles.table}>
        <thead><tr><th>ชื่อ</th><th>หมวดหมู่</th><th>วิทยากร</th><th>สถานะ</th><th></th></tr></thead>
        <tbody>
          {visible.length === 0 && <tr><td colSpan={5} className={styles.empty}>ยังไม่มีคอร์ส</td></tr>}
          {visible.map((item) => (
            <tr key={item.id}>
              <td>{item.title}{item.isFeatured ? " · แนะนำ" : ""}</td>
              <td>{item.categoryName || "—"}</td>
              <td>{item.instructorName || "—"}</td>
              <td>{STATUS_LABEL[item.status]}</td>
              <td className={styles.actions}>
                <Link className={styles.ghost} href={`/backoffice/module/academy/courses/${item.id}`}>แก้ไข</Link>
                <button className={styles.danger} type="button" onClick={() => remove(item)}>ลบ</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

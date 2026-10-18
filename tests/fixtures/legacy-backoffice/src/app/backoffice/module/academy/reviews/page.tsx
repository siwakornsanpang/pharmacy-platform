"use client";

import { FormEvent, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { authFetch } from "@/app/utils/authFetch";
import styles from "../academy.module.css";

const API = process.env.NEXT_PUBLIC_API_URL;

type Course = { id: number; title: string };
type Review = {
  id: number;
  courseId: number;
  courseTitle: string;
  rating: number;
  body: string;
  reviewerName: string;
  reviewerRole: string | null;
};

const empty = { courseId: "", rating: "5", body: "", reviewerName: "", reviewerRole: "" };

export default function AcademyReviewsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [items, setItems] = useState<Review[]>([]);
  const [form, setForm] = useState(empty);
  const [formOpen, setFormOpen] = useState(false);

  const load = async () => {
    const [courseRes, reviewRes] = await Promise.all([
      authFetch(`${API}/academy/admin/courses`),
      authFetch(`${API}/academy/admin/reviews`),
    ]);
    if (courseRes.ok) setCourses(await courseRes.json());
    if (reviewRes.ok) setItems(await reviewRes.json());
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const res = await authFetch(`${API}/academy/admin/reviews`, {
      method: "POST",
      body: JSON.stringify({ ...form, courseId: Number(form.courseId), rating: Number(form.rating) }),
    });
    if (!res.ok) {
      const data = await res.json();
      Swal.fire("บันทึกไม่สำเร็จ", data.message || "", "error");
      return;
    }
    setForm(empty);
    setFormOpen(false);
    load();
  };

  const remove = async (item: Review) => {
    const confirmed = await Swal.fire({ title: "ลบรีวิวนี้?", showCancelButton: true, confirmButtonText: "ลบ" });
    if (!confirmed.isConfirmed) return;
    await authFetch(`${API}/academy/admin/reviews/${item.id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>รีวิว</h1>
          <p className={styles.subtitle}>รีวิวของคอร์สที่เผยแพร่แล้วจะไปอยู่บนหน้า Academy</p>
        </div>
        <button className={styles.primary} type="button" onClick={() => { setForm(empty); setFormOpen(true); }}>เพิ่มรีวิว</button>
      </div>
      {formOpen && <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.row2}>
          <label>คอร์ส
            <select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} required>
              <option value="">เลือกคอร์ส</option>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
          </label>
          <label>คะแนน
            <select value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}>
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
        <div className={styles.row2}>
          <label>ชื่อผู้รีวิว<input value={form.reviewerName} onChange={(e) => setForm({ ...form, reviewerName: e.target.value })} required /></label>
          <label>บทบาท<input value={form.reviewerRole} onChange={(e) => setForm({ ...form, reviewerRole: e.target.value })} placeholder="เภสัชกรโรงพยาบาล" /></label>
        </div>
        <label>ข้อความ<textarea rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required /></label>
        <div className={styles.actions}>
          <button className={styles.primary} type="submit">บันทึก</button>
          <button className={styles.ghost} type="button" onClick={() => { setForm(empty); setFormOpen(false); }}>ยกเลิก</button>
        </div>
      </form>}
      <table className={styles.table} style={{ marginTop: "1.25rem" }}>
        <thead><tr><th>คอร์ส</th><th>ผู้รีวิว</th><th>คะแนน</th><th>ข้อความ</th><th></th></tr></thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={5} className={styles.empty}>ยังไม่มีรีวิว</td></tr>}
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.courseTitle}</td>
              <td>{item.reviewerName}<div style={{ color: "#6b705c" }}>{item.reviewerRole}</div></td>
              <td>{item.rating}</td>
              <td>{item.body}</td>
              <td><button className={styles.danger} type="button" onClick={() => remove(item)}>ลบ</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

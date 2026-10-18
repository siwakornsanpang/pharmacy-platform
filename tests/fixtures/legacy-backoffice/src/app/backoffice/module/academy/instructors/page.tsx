"use client";

import { FormEvent, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { authFetch } from "@/app/utils/authFetch";
import styles from "../academy.module.css";

const API = process.env.NEXT_PUBLIC_API_URL;

type Instructor = {
  id: number;
  name: string;
  title: string | null;
  expertise: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isVisible: boolean;
};

const empty = { name: "", title: "", expertise: "", imageUrl: "", sortOrder: 0, isVisible: true };

export default function AcademyInstructorsPage() {
  const [items, setItems] = useState<Instructor[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = async () => {
    const res = await authFetch(`${API}/academy/admin/instructors`);
    if (res.ok) setItems(await res.json());
  };

  useEffect(() => { load(); }, []);

  const reset = () => { setForm(empty); setEditingId(null); setFile(null); setFormOpen(false); };

  const startAdd = () => { setForm(empty); setEditingId(null); setFile(null); setFormOpen(true); };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    let imageUrl = form.imageUrl || null;
    if (file) {
      const body = new FormData();
      body.append("file", file);
      const uploaded = await authFetch(`${API}/academy/admin/upload`, { method: "POST", body });
      const data = await uploaded.json();
      if (!uploaded.ok) {
        Swal.fire("อัปโหลดไม่สำเร็จ", data.message || "", "error");
        return;
      }
      imageUrl = data.url;
    }
    const payload = { ...form, imageUrl, sortOrder: Number(form.sortOrder) };
    const res = await authFetch(
      editingId ? `${API}/academy/admin/instructors/${editingId}` : `${API}/academy/admin/instructors`,
      { method: editingId ? "PUT" : "POST", body: JSON.stringify(payload) }
    );
    if (!res.ok) {
      const data = await res.json();
      Swal.fire("บันทึกไม่สำเร็จ", data.message || "", "error");
      return;
    }
    reset();
    load();
  };

  const remove = async (item: Instructor) => {
    const confirmed = await Swal.fire({ title: `ลบ ${item.name}?`, showCancelButton: true, confirmButtonText: "ลบ" });
    if (!confirmed.isConfirmed) return;
    await authFetch(`${API}/academy/admin/instructors/${item.id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>วิทยากร</h1>
          <p className={styles.subtitle}>แสดงบนส่วนวิทยากรผู้เชี่ยวชาญ และผูกกับคอร์สได้</p>
        </div>
        <button className={styles.primary} type="button" onClick={startAdd}>เพิ่มวิทยากร</button>
      </div>
      {formOpen && <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.row2}>
          <label>ชื่อ<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label>ตำแหน่ง<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        </div>
        <label>ความเชี่ยวชาญ<input value={form.expertise} onChange={(e) => setForm({ ...form, expertise: e.target.value })} /></label>
        <div className={styles.row2}>
          <label>ลำดับ<input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} /></label>
          <label>รูป<input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
        </div>
        <label className={styles.checks}>
          <input type="checkbox" checked={form.isVisible} onChange={(e) => setForm({ ...form, isVisible: e.target.checked })} />
          แสดงบนหน้าเว็บ
        </label>
        <div className={styles.actions}>
          <button className={styles.primary} type="submit">{editingId ? "บันทึกการแก้ไข" : "บันทึก"}</button>
          <button className={styles.ghost} type="button" onClick={reset}>ยกเลิก</button>
        </div>
      </form>}
      <table className={styles.table} style={{ marginTop: "1.25rem" }}>
        <thead><tr><th>รูป</th><th>ชื่อ</th><th>ตำแหน่ง</th><th></th></tr></thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={4} className={styles.empty}>ยังไม่มีวิทยากร</td></tr>}
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.imageUrl ? <img className={styles.thumb} src={item.imageUrl} alt="" /> : "—"}</td>
              <td>{item.name}<div style={{ color: "#6b705c", fontSize: "0.85rem" }}>{item.expertise}</div></td>
              <td>{item.title || "—"}</td>
              <td className={styles.actions}>
                <button className={styles.ghost} type="button" onClick={() => { setEditingId(item.id); setFile(null); setFormOpen(true); setForm({ name: item.name, title: item.title || "", expertise: item.expertise || "", imageUrl: item.imageUrl || "", sortOrder: item.sortOrder, isVisible: item.isVisible }); }}>แก้ไข</button>
                <button className={styles.danger} type="button" onClick={() => remove(item)}>ลบ</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { authFetch } from "@/app/utils/authFetch";
import styles from "../academy.module.css";

const API = process.env.NEXT_PUBLIC_API_URL;

type Category = {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  color: string | null;
  sortOrder: number;
  isVisible: boolean;
};

const empty = {
  name: "",
  description: "",
  imageUrl: "",
  color: "#737300",
  sortOrder: 0,
  isVisible: true,
};

export default function AcademyCategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const load = async () => {
    const res = await authFetch(`${API}/academy/admin/categories`);
    if (res.ok) setItems(await res.json());
  };

  useEffect(() => {
    load();
  }, []);

  const reset = () => {
    setForm(empty);
    setEditingId(null);
    setFile(null);
    setFormOpen(false);
  };

  const startAdd = () => {
    setForm(empty);
    setEditingId(null);
    setFile(null);
    setFormOpen(true);
  };

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
      editingId ? `${API}/academy/admin/categories/${editingId}` : `${API}/academy/admin/categories`,
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

  const remove = async (item: Category) => {
    const confirmed = await Swal.fire({ title: `ลบ ${item.name}?`, showCancelButton: true, confirmButtonText: "ลบ" });
    if (!confirmed.isConfirmed) return;
    await authFetch(`${API}/academy/admin/categories/${item.id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>หมวดหมู่</h1>
          <p className={styles.subtitle}>แสดงบนส่วนหมวดหมู่ยอดนิยมของหน้า Academy</p>
        </div>
        <button className={styles.primary} type="button" onClick={startAdd}>เพิ่มหมวดหมู่</button>
      </div>

      {formOpen && <form className={styles.form} onSubmit={onSubmit}>
        <div className={styles.row2}>
          <label>ชื่อ<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
          <label>สีป้าย<input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} /></label>
        </div>
        <label>คำอธิบาย<textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <div className={styles.row2}>
          <label>ลำดับ<input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })} /></label>
          <label>รูปหมวดหมู่<input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
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
        <thead>
          <tr><th>รูป</th><th>ชื่อ</th><th>ลำดับ</th><th>แสดง</th><th></th></tr>
        </thead>
        <tbody>
          {items.length === 0 && <tr><td colSpan={5} className={styles.empty}>ยังไม่มีหมวดหมู่</td></tr>}
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.imageUrl ? <img className={styles.thumb} src={item.imageUrl} alt="" /> : "—"}</td>
              <td>{item.name}</td>
              <td>{item.sortOrder}</td>
              <td>{item.isVisible ? "แสดง" : "ซ่อน"}</td>
              <td className={styles.actions}>
                <button className={styles.ghost} type="button" onClick={() => { setEditingId(item.id); setFile(null); setFormOpen(true); setForm({ name: item.name, description: item.description || "", imageUrl: item.imageUrl || "", color: item.color || "#737300", sortOrder: item.sortOrder, isVisible: item.isVisible }); }}>แก้ไข</button>
                <button className={styles.danger} type="button" onClick={() => remove(item)}>ลบ</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

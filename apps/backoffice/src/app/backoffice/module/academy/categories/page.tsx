"use client";

import { FormEvent, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { mutationErr, mutationOk } from "@/shared/feedback/mutation-alert";
import { deleteCategory, listCategories, saveCategory } from "@/features/academy/api";
import styles from "../academy.module.css";

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
    try { setItems(await listCategories() as Category[]); } catch { /* keep */ }
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
    const imageUrl = form.imageUrl || null;
    if (file) {
      Swal.fire("อัปโหลดไม่สำเร็จ", "บันทึกด้วยลิงก์รูปที่มีอยู่", "error");
      return;
    }
    const payload = { ...form, imageUrl, sortOrder: Number(form.sortOrder) };
    try {
      await saveCategory(payload, editingId ?? undefined);
    } catch (error) {
      await mutationErr(error instanceof Error ? error.message : undefined);
      return;
    }
    await mutationOk("save", async () => { reset(); await load(); });
  };

  const remove = async (item: Category) => {
    const confirmed = await Swal.fire({ title: `ลบ ${item.name}?`, showCancelButton: true, confirmButtonText: "ลบ" });
    if (!confirmed.isConfirmed) return;
    try {
      await deleteCategory(item.id);
      await mutationOk("delete", load);
    } catch {
      await mutationErr();
    }
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

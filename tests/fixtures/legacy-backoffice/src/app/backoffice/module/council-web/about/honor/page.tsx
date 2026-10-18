// src/app/backoffice/module/council-web/about/honor/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Edit,
  Trash2,
  Plus,
  Search,
  GripVertical,
  ChevronRight,
  Award,
} from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import styles from "./honor.module.css";
import { authFetch } from "@/app/utils/authFetch";
import CrudModal from "@/app/components/ui/CrudModal";
import Link from "next/link";

const MySwal = withReactContent(Swal);
const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface HonorAward {
  id: number;
  order: number;
  name: string;
  description: string | null;
  recipientCount: number;
}

export default function HonorAwardsPage() {
  const [awards, setAwards] = useState<HonorAward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Sorting
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Drag and Drop
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });

  const fetchAwards = async () => {
    try {
      const res = await authFetch(`${API_URL}/honor-awards`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setAwards(data);
      } else {
        setAwards([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAwards();
  }, []);

  const filteredItems = useMemo(() => {
    return awards
      .filter((item) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          item.name.toLowerCase().includes(searchLower) ||
          (item.description || "").toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => {
        if (sortDirection === "asc") return a.order - b.order;
        return b.order - a.order;
      });
  }, [awards, searchTerm, sortDirection]);

  const handleSort = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };
  const getSortIcon = () => (sortDirection === "asc" ? "↑" : "↓");

  // Drag handlers
  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => {
      if (e.target instanceof HTMLElement) e.target.style.opacity = "0.5";
    }, 0);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    if (sortDirection !== "asc") return;
    dragOverItem.current = index;
  };

  const handleDragOver = (e: React.DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnd = async (e: React.DragEvent<HTMLTableRowElement>) => {
    if (e.target instanceof HTMLElement) e.target.style.opacity = "1";

    if (
      dragItem.current === null ||
      dragOverItem.current === null ||
      dragItem.current === dragOverItem.current ||
      sortDirection !== "asc"
    ) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }

    const copyFiltered = [...filteredItems];
    const draggedItemContent = copyFiltered[dragItem.current];
    copyFiltered.splice(dragItem.current, 1);
    copyFiltered.splice(dragOverItem.current, 0, draggedItemContent);

    const payload = copyFiltered.map((item, index) => ({
      id: item.id,
      order: index + 1,
    }));

    const newItems = awards.map((m) => {
      const payloadMatch = payload.find((p) => p.id === m.id);
      if (payloadMatch) return { ...m, order: payloadMatch.order };
      return m;
    });

    setAwards(newItems);
    dragItem.current = null;
    dragOverItem.current = null;

    try {
      MySwal.fire({
        title: "กำลังบันทึกการจัดเรียง...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      const res = await authFetch(`${API_URL}/honor-awards/reorder`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      MySwal.close();
      const Toast = Swal.mixin({ toast: true, position: "top-end", showConfirmButton: false, timer: 1200 });
      Toast.fire({ icon: "success", title: "จัดเรียงสำเร็จ" });
    } catch (err) {
      console.error(err);
      MySwal.fire("Error", "เกิดข้อผิดพลาดในการบันทึกลำดับ", "error");
      fetchAwards();
    }
  };

  const openModal = (item?: HonorAward) => {
    if (item) {
      setEditingId(item.id);
      setFormData({ name: item.name, description: item.description || "" });
    } else {
      setEditingId(null);
      setFormData({ name: "", description: "" });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      Swal.fire("กรุณากรอกชื่อรางวัล", "", "warning");
      return;
    }

    MySwal.fire({ title: "กำลังบันทึก...", didOpen: () => Swal.showLoading() });
    try {
      const url = editingId
        ? `${API_URL}/honor-awards/${editingId}`
        : `${API_URL}/honor-awards`;
      const method = editingId ? "PUT" : "POST";

      const res = await authFetch(url, {
        method,
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
        }),
      });
      if (res.ok) {
        await MySwal.fire("สำเร็จ", "บันทึกข้อมูลเรียบร้อย", "success");
        setIsModalOpen(false);
        fetchAwards();
      } else {
        throw new Error();
      }
    } catch (err) {
      MySwal.fire("Error", "เกิดข้อผิดพลาด", "error");
    }
  };

  const handleDelete = async (id: number) => {
    const confirm = await MySwal.fire({
      title: "ยืนยันการลบรางวัล?",
      text: "ข้อมูลรางวัลและผู้ได้รับรางวัลทั้งหมดจะถูกลบถาวร",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "ลบรางวัล",
      cancelButtonText: "ยกเลิก",
    });

    if (confirm.isConfirmed) {
      await authFetch(`${API_URL}/honor-awards/${id}`, { method: "DELETE" });
      fetchAwards();
      MySwal.fire("ลบสำเร็จ", "", "success");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>จัดการรางวัลเกียรติประวัติ</h1>
          <p className={styles.subtitle}>
            เพิ่มรางวัล แล้วกดเข้าไปเพื่อจัดการรายชื่อผู้ได้รับรางวัล
          </p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="ค้นหารางวัล..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button onClick={() => openModal()} className={styles.btnAdd}>
          <Plus size={20} /> เพิ่มรางวัลใหม่
        </button>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.tableHead}>
                <th
                  className={`${styles.tableTh} ${styles.thSortable} text-center w-16`}
                  onClick={handleSort}
                >
                  ลำดับ{" "}
                  <span className={styles.sortIconActive}>
                    {getSortIcon()}
                  </span>
                </th>
                <th className={styles.tableTh}>ชื่อรางวัล</th>
                <th className={styles.tableTh}>คำอธิบาย</th>
                <th className={`${styles.tableTh} text-center w-32`}>
                  จำนวนผู้ได้รับ
                </th>
                <th className={`${styles.tableTh} text-center w-32`}>
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {awards.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    ยังไม่มีรางวัล กดปุ่ม &quot;เพิ่มรางวัลใหม่&quot; เพื่อเริ่มต้น
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, index) => (
                  <tr
                    key={item.id}
                    className={`${styles.tableRow} ${sortDirection === "asc" ? styles.draggableRow : ""}`}
                    draggable={sortDirection === "asc"}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                  >
                    {/* ลำดับ */}
                    <td className={`${styles.tableTd} text-center`}>
                      <div className="flex items-center justify-center gap-2">
                        {sortDirection === "asc" && (
                          <GripVertical
                            size={16}
                            className="text-gray-400 cursor-grab active:cursor-grabbing hover:text-gray-600 transition-colors"
                          />
                        )}
                        <span className={styles.orderBadge}>{item.order}</span>
                      </div>
                    </td>

                    {/* ชื่อรางวัล (clickable link) */}
                    <td className={`${styles.tableTd} font-medium`}>
                      <Link
                        href={`/backoffice/module/council-web/about/honor/${item.id}`}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                        style={{ textDecoration: "none" }}
                      >
                        <Award size={18} />
                        {item.name}
                        <ChevronRight size={16} className="text-gray-400" />
                      </Link>
                    </td>

                    {/* คำอธิบาย */}
                    <td className={`${styles.tableTd} text-gray-600`}>
                      {item.description || "-"}
                    </td>

                    {/* จำนวนผู้ได้รับ */}
                    <td className={`${styles.tableTd} text-center`}>
                      <span
                        className={styles.orderBadge}
                        style={{ background: item.recipientCount > 0 ? "#dbeafe" : "#f3f4f6", color: item.recipientCount > 0 ? "#1d4ed8" : "#9ca3af" }}
                      >
                        {item.recipientCount} คน
                      </span>
                    </td>

                    {/* จัดการ */}
                    <td className={`${styles.tableTd} text-center`}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          className={styles.btnIconEdit}
                          onClick={() => openModal(item)}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          className={styles.btnIconDelete}
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== CRUD Modal ==================== */}
      {isModalOpen && (
        <CrudModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          title={editingId ? "แก้ไขรางวัล" : "เพิ่มรางวัลใหม่"}
        >
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>ชื่อรางวัล *</label>
            <input
              className={styles.formInput}
              placeholder="เช่น เภสัชกรยอดเยี่ยม"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>คำอธิบายรางวัล</label>
            <textarea
              className={styles.formTextarea}
              placeholder="อธิบายรายละเอียดเกี่ยวกับรางวัลนี้ (ไม่บังคับ)"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />
          </div>
        </CrudModal>
      )}
    </div>
  );
}
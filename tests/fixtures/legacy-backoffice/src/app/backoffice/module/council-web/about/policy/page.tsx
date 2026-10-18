"use client";

import { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import {
  Edit,
  Trash2,
  Plus,
  Search,
  GripVertical,
  ChevronRight,
} from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import styles from "./policy.module.css";
import { authFetch } from "@/app/utils/authFetch";
import CrudModal from "@/app/components/ui/CrudModal";
import Link from "next/link";

const MySwal = withReactContent(Swal);
const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface PolicyCategory {
  id: number;
  title: string;
  order: number;
  projectCount: number;
}

// Optimized Row Component
const PolicyRow = memo(({ 
  item, 
  index, 
  onEdit, 
  onDelete, 
  onDragStart, 
  onDragEnter, 
  onDragEnd 
}: { 
  item: PolicyCategory; 
  index: number;
  onEdit: (item: PolicyCategory) => void;
  onDelete: (id: number) => void;
  onDragStart: (e: React.DragEvent<HTMLTableRowElement>, index: number) => void;
  onDragEnter: (e: React.DragEvent<HTMLTableRowElement>, index: number) => void;
  onDragEnd: () => void;
}) => (
  <tr 
    className={styles.tableRow}
    draggable
    onDragStart={(e) => onDragStart(e, index)}
    onDragEnter={(e) => onDragEnter(e, index)}
    onDragEnd={onDragEnd}
    onDragOver={(e) => e.preventDefault()}
  >
    <td className="p-4 text-center">
      <div className="flex items-center justify-center gap-2">
         <GripVertical size={16} className="text-gray-400 cursor-move" />
         <span className={styles.orderBadge}>{item.order}</span>
      </div>
    </td>
    <td className="p-4 font-medium">
      <Link 
        href={`/backoffice/module/council-web/about/policy/${item.id}`}
        className="flex items-center gap-2 text-blue-600 hover:underline"
      >
        {item.title}
        <ChevronRight size={16} className="text-gray-400" />
      </Link>
    </td>
    <td className="p-4 text-center">
      <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-md text-xs">
        <span style={{ fontSize: '16px' }} className="font-black mr-1">{item.projectCount}</span> 
        โครงการ
      </span>
    </td>
    <td className="p-4 text-center">
      <div className="flex justify-center gap-2">
        <button onClick={() => onEdit(item)} className={styles.btnIconEdit} title="แก้ไข"><Edit size={16} /></button>
        <button onClick={() => onDelete(item.id)} className={styles.btnIconDelete} title="ลบ"><Trash2 size={16} /></button>
      </div>
    </td>
  </tr>
));

PolicyRow.displayName = "PolicyRow";

export default function PolicyCategoriesPage() {
  const [categories, setCategories] = useState<PolicyCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Sorting
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Drag and Drop
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalTitle, setModalTitle] = useState("");

  const fetchCategories = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/policy-categories`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setCategories(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const filteredItems = useMemo(() => {
    return [...categories]
      .filter((item) => item.title.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => (sortDirection === "asc" ? a.order - b.order : b.order - a.order));
  }, [categories, searchTerm, sortDirection]);

  const handleSort = useCallback(() => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  }, []);

  const handleDragStart = useCallback((e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLTableRowElement>, index: number) => {
    e.preventDefault();
    dragOverItem.current = index;
  }, []);

  const handleDragEnd = useCallback(async () => {
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) return;

    const copyItems = [...filteredItems];
    const draggedItem = copyItems[dragItem.current];
    copyItems.splice(dragItem.current, 1);
    copyItems.splice(dragOverItem.current, 0, draggedItem);

    const payload = copyItems.map((item, index) => ({ id: item.id, order: index + 1 }));
    
    // Optimistic update
    setCategories(prev => prev.map(cat => {
      const p = payload.find(x => x.id === cat.id);
      return p ? { ...cat, order: p.order } : cat;
    }));

    try {
      await authFetch(`${API_URL}/policy-categories/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      fetchCategories();
    }
    
    dragItem.current = null;
    dragOverItem.current = null;
  }, [filteredItems, fetchCategories]);

  const handleEdit = useCallback((item: PolicyCategory) => {
    setEditingId(item.id);
    setModalTitle(item.title);
    setIsModalOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditingId(null);
    setModalTitle("");
    setIsModalOpen(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    MySwal.fire({ title: "กำลังบันทึก...", didOpen: () => Swal.showLoading() });
    try {
      const url = editingId ? `${API_URL}/policy-categories/${editingId}` : `${API_URL}/policy-categories`;
      const method = editingId ? "PUT" : "POST";

      const res = await authFetch(url, { 
        method, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: modalTitle }) 
      });
      if (res.ok) {
        await MySwal.fire({
          title: "สำเร็จ",
          text: "บันทึกข้อมูลเรียบร้อย",
          icon: "success",
          timer: 1000,
          showConfirmButton: false
        });
        setIsModalOpen(false);
        fetchCategories();
      } else {
        throw new Error();
      }
    } catch (err) {
      MySwal.fire("Error", "เกิดข้อผิดพลาด", "error");
    }
  };

  const handleDelete = useCallback(async (id: number) => {
    const confirm = await MySwal.fire({
      title: "ยืนยันการลบ?",
      text: "โครงการทั้งหมดภายใต้นโยบายนี้จะถูกลบถาวร",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "ลบข้อมูล",
    });
    if (confirm.isConfirmed) {
      await authFetch(`${API_URL}/policy-categories/${id}`, { method: "DELETE" });
      fetchCategories();
      MySwal.fire("ลบสำเร็จ", "", "success");
    }
  }, [fetchCategories]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>จัดการนโยบายสภาเภสัชกรรม</h1>
          <p className={styles.subtitle}>จัดการนโยบายหลักและโครงการภายใต้การกำกับดูแล</p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="ค้นหาชื่อนโยบาย..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button onClick={handleAdd} className={styles.btnAdd}>
          <Plus size={20} /> เพิ่มนโยบายใหม่
        </button>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.tableHead}>
                <th className={`${styles.tableTh} text-center w-16 cursor-pointer hover:bg-gray-100 transition-colors`} onClick={handleSort}>
                  ลำดับ {sortDirection === "asc" ? "↑" : "↓"}
                </th>
                <th className={styles.tableTh}>นโยบาย</th>
                <th className={`${styles.tableTh} text-center w-32`}>จำนวนโครงการ</th>
                <th className={`${styles.tableTh} text-center w-32`}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400">กำลังโหลด...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-400">ยังไม่มีข้อมูลนโยบาย</td></tr>
              ) : (
                filteredItems.map((item, index) => (
                  <PolicyRow 
                    key={item.id}
                    item={item}
                    index={index}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onDragStart={handleDragStart}
                    onDragEnter={handleDragEnter}
                    onDragEnd={handleDragEnd}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CrudModal
        isOpen={isModalOpen}
        title={editingId ? "แก้ไขนโยบาย" : "เพิ่มนโยบายใหม่"}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        maxWidth="30rem"
      >
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>นโยบาย *</label>
          <input 
            type="text" 
            required 
            className={styles.formInput} 
            value={modalTitle} 
            onChange={(e) => setModalTitle(e.target.value)} 
            autoFocus
          />
        </div>
      </CrudModal>
    </div>
  );
}

"use client";

import { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Edit,
  Trash2,
  Plus,
  Search,
  GripVertical,
  ArrowLeft,
  FileText,
  Upload,
} from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import styles from "../policy.module.css";
import { authFetch } from "@/app/utils/authFetch";
import CrudModal from "@/app/components/ui/CrudModal";

const MySwal = withReactContent(Swal);
const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Project {
  id: number;
  categoryId: number;
  name: string;
  summaryPdfUrl: string | null;
  status: "planned" | "ongoing" | "completed" | "delayed" | "terminated";
  order: number;
}

const STATUS_OPTIONS = [
  { value: "planned", label: "เริ่มวางแผน", color: "#6b7280" },
  { value: "ongoing", label: "กำลังดำเนินการ", color: "#3b82f6" },
  { value: "completed", label: "เสร็จโครงการ", color: "#10b981" },
  { value: "delayed", label: "ชะลอโครงการ", color: "#f59e0b" },
  { value: "terminated", label: "ยุติโครงการ", color: "#ef4444" },
];

// Optimized Project Row Component
const ProjectRow = memo(({ 
  item, 
  index, 
  onEdit, 
  onDelete, 
  onDragStart, 
  onDragEnter, 
  onDragEnd 
}: { 
  item: Project; 
  index: number;
  onEdit: (item: Project) => void;
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
    <td className="p-4 font-medium text-gray-800">{item.name}</td>
    <td className="p-4 text-center">
      <span 
        className={styles.statusBadge}
        style={{ 
          backgroundColor: `${STATUS_OPTIONS.find(s => s.value === item.status)?.color}15`,
          color: STATUS_OPTIONS.find(s => s.value === item.status)?.color
        }}
      >
        {STATUS_OPTIONS.find(s => s.value === item.status)?.label}
      </span>
    </td>
    <td className="p-4 text-center">
      {item.summaryPdfUrl ? (
        <a href={item.summaryPdfUrl} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline flex items-center justify-center gap-1">
          <FileText size={16} /> ดู PDF
        </a>
      ) : (
        <span className="text-gray-300">ไม่มีไฟล์</span>
      )}
    </td>
    <td className="p-4 text-center">
      <div className="flex justify-center gap-2">
        <button onClick={() => onEdit(item)} className={styles.btnIconEdit} title="แก้ไข"><Edit size={16} /></button>
        <button onClick={() => onDelete(item.id)} className={styles.btnIconDelete} title="ลบ"><Trash2 size={16} /></button>
      </div>
    </td>
  </tr>
));

ProjectRow.displayName = "ProjectRow";

export default function PolicyProjectsPage() {
  const params = useParams();
  const categoryId = params.categoryId as string;

  const [categoryTitle, setCategoryTitle] = useState<string>("");
  const [categoryOrder, setCategoryOrder] = useState<number | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
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
  const [modalData, setModalData] = useState({ 
    name: "", 
    status: "planned" as Project["status"], 
    order: 1,
    summaryPdf: null as File | null,
    summaryPdfUrl: null as string | null
  });

  const fetchCategory = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/policy-categories/${categoryId}`);
      if (res.ok) {
        const data = await res.json();
        setCategoryTitle(data.title);
        setCategoryOrder(data.order);
      }
    } catch (err) {
      console.error(err);
    }
  }, [categoryId]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/policy-projects?categoryId=${categoryId}`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    fetchCategory();
    fetchProjects();
  }, [fetchCategory, fetchProjects]);

  const filteredItems = useMemo(() => {
    return [...projects]
      .filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => (sortDirection === "asc" ? a.order - b.order : b.order - a.order));
  }, [projects, searchTerm, sortDirection]);

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
    setProjects(prev => prev.map(p => {
      const match = payload.find(x => x.id === p.id);
      return match ? { ...p, order: match.order } : p;
    }));

    try {
      await authFetch(`${API_URL}/policy-projects/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      fetchProjects();
    }
    
    dragItem.current = null;
    dragOverItem.current = null;
  }, [filteredItems, fetchProjects]);

  const handleEdit = useCallback((item: Project) => {
    setEditingId(item.id);
    setModalData({ 
      name: item.name, 
      status: item.status, 
      order: item.order,
      summaryPdf: null,
      summaryPdfUrl: item.summaryPdfUrl
    });
    setIsModalOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setEditingId(null);
    const maxOrder = projects.length > 0 ? Math.max(...projects.map(p => p.order)) : 0;
    setModalData({ 
      name: "", 
      status: "planned", 
      order: maxOrder + 1,
      summaryPdf: null,
      summaryPdfUrl: null
    });
    setIsModalOpen(true);
  }, [projects]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    MySwal.fire({ title: "กำลังบันทึก...", didOpen: () => Swal.showLoading() });
    try {
      const form = new FormData();
      form.append("categoryId", categoryId);
      form.append("name", modalData.name);
      form.append("status", modalData.status);
      form.append("order", modalData.order.toString());
      if (modalData.summaryPdf) form.append("summaryPdf", modalData.summaryPdf);
      if (!modalData.summaryPdf && !modalData.summaryPdfUrl && editingId) {
        form.append("removePdf", "true");
      }

      const url = editingId ? `${API_URL}/policy-projects/${editingId}` : `${API_URL}/policy-projects`;
      const method = editingId ? "PUT" : "POST";

      const res = await authFetch(url, { method, body: form });
      if (res.ok) {
        await MySwal.fire({
          title: "สำเร็จ",
          text: "บันทึกข้อมูลเรียบร้อย",
          icon: "success",
          timer: 1000,
          showConfirmButton: false
        });
        setIsModalOpen(false);
        fetchProjects();
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
      text: "ข้อมูลจะถูกลบถาวร",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "ลบข้อมูล",
    });
    if (confirm.isConfirmed) {
      await authFetch(`${API_URL}/policy-projects/${id}`, { method: "DELETE" });
      fetchProjects();
      MySwal.fire("ลบสำเร็จ", "", "success");
    }
  }, [fetchProjects]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <Link
            href="/backoffice/module/council-web/about/policy"
            className={styles.btnBack}
          >
            <ArrowLeft size={16} /> กลับไปหน้านโยบาย
          </Link>
          <h1 className={styles.title}>จัดการโครงการ</h1>
          <p className={styles.subtitle}>
            {categoryOrder !== null && (
              <span className="font-bold text-gray-700">นโยบายลำดับที่ {categoryOrder}: </span>
            )}
            {categoryTitle || "กำลังโหลด..."}
          </p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="ค้นหาชื่อโครงการ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button onClick={handleAdd} className={styles.btnAdd}>
          <Plus size={20} /> เพิ่มโครงการใหม่
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
                <th className={styles.tableTh}>ชื่อโครงการ</th>
                <th className={`${styles.tableTh} text-center w-40`}>สถานะ</th>
                <th className={`${styles.tableTh} text-center w-32`}>สรุปโครงการ (PDF)</th>
                <th className={`${styles.tableTh} text-center w-32`}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">กำลังโหลด...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">ยังไม่มีข้อมูลโครงการ</td></tr>
              ) : (
                filteredItems.map((item, index) => (
                  <ProjectRow 
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
        title={editingId ? "แก้ไขโครงการ" : "เพิ่มโครงการใหม่"}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        maxWidth="35rem"
      >
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>ชื่อโครงการ *</label>
          <textarea
            required 
            className={styles.formTextarea} 
            value={modalData.name} 
            onChange={(e) => setModalData({ ...modalData, name: e.target.value })} 
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>สถานะ</label>
            <select
              className={styles.formSelect}
              value={modalData.status}
              onChange={(e) => setModalData({ ...modalData, status: e.target.value as Project["status"] })}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>ลำดับ</label>
            <input
              type="number" 
              className={styles.formInput}
              value={modalData.order} 
              onChange={(e) => setModalData({ ...modalData, order: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>ไฟล์ PDF สรุปโครงการ</label>
          <div className="flex flex-col gap-2">
            {modalData.summaryPdfUrl ? (
              <div className={styles.pdfPreview}>
                <div className="flex items-center gap-2">
                  <FileText size={18} />
                  <span>มีไฟล์ PDF แล้ว</span>
                </div>
                <button type="button" onClick={() => setModalData({ ...modalData, summaryPdfUrl: null })} className="text-red-500 hover:bg-red-100 p-1 rounded">
                  <Trash2 size={16} />
                </button>
              </div>
            ) : (
              <label className={styles.uploadArea}>
                <Upload size={32} className="text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">{modalData.summaryPdf ? modalData.summaryPdf.name : "คลิกเพื่ออัปโหลดไฟล์ PDF"}</span>
                <input
                  type="file" accept="application/pdf" className="hidden"
                  onChange={(e) => setModalData({ ...modalData, summaryPdf: e.target.files?.[0] || null })}
                />
              </label>
            )}
          </div>
        </div>
      </CrudModal>
    </div>
  );
}

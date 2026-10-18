// src/app/backoffice/module/council-web/law/page.tsx
"use client";

import {
  Save, Plus, Trash2, FileText, Download, UploadCloud, Edit,
  Globe, Power, Loader2, Search, GripVertical, X
} from "lucide-react";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import styles from "./law.module.css";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { authFetch } from "@/app/utils/authFetch";
import CrudModal from "@/app/components/ui/CrudModal";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";


const MySwal = withReactContent(Swal);
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ===== Category Tabs =====
const CATEGORIES = [
  { key: "law1", label: "พ.ร.บ. วิชาชีพเภสัชกรรม", icon: "⚖️" },
  { key: "law2", label: "ข้อบังคับสภาเภสัชกรรม", icon: "📋" },
  { key: "law3", label: "ประกาศสภาเภสัชกรรม", icon: "📢" },
  { key: "law4", label: "กฎกระทรวง", icon: "🏛️" },
  { key: "law5", label: "กฎหมายอื่นที่เกี่ยวข้อง", icon: "📜" },
  { key: "law6", label: "คำสั่งสภาเภสัชกรรม", icon: "📑" },
  { key: "law7", label: "ระเบียบสภาเภสัชกรรม", icon: "📄" },
];

interface LawItem {
  id: number;
  category: string;
  title: string;
  year: number | null;
  announcedAt: string | null;
  order: number;
  pdfUrl: string | null;
  status: string;
}

// ===== Sortable Row Component =====
function SortableRow({
  law,
  togglingId,
  onToggleStatus,
  onEdit,
  onDelete,
  isDragDisabled,
}: {
  law: LawItem;
  togglingId: number | null;
  onToggleStatus: (item: LawItem) => void;
  onEdit: (item: LawItem) => void;
  onDelete: (id: number) => void;
  isDragDisabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: law.id, disabled: isDragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    backgroundColor: isDragging ? "#eff6ff" : undefined,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${styles.tableRow} ${law.status === "offline" ? styles.rowOffline : ""}`}
    >
      <td style={{ textAlign: "center", width: "60px" }}>
        <span
          {...attributes}
          {...listeners}
          className={`${styles.dragHandle} ${isDragDisabled ? styles.dragDisabled : ""}`}
          title={isDragDisabled ? "ไม่สามารถลากข้ามปีได้" : "ลากเพื่อเปลี่ยนลำดับ"}
        >
          <GripVertical size={16} />
        </span>
      </td>
      <td style={{ textAlign: "center", fontWeight: 500, color: "#6b7280" }}>{law.order}</td>
      <td style={{ textAlign: "center" }}>{law.year || "-"}</td>
      <td style={{ fontWeight: 500, color: "#1f2937" }}>{law.title}</td>
      <td style={{ textAlign: "center" }}>
        {law.pdfUrl ? (
          <a href={law.pdfUrl} target="_blank" rel="noreferrer" className={styles.pdfLink}>
            <Download size={16} /> PDF
          </a>
        ) : (
          <span style={{ color: "#d1d5db" }}>-</span>
        )}
      </td>
      <td style={{ textAlign: "center" }}>
        {law.announcedAt
          ? new Date(law.announcedAt).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" })
          : "-"}
      </td>
      <td style={{ textAlign: "center" }}>
        <div
          className={`${styles.statusBadge} ${law.status === "online" ? styles.statusOnline : styles.statusOffline}`}
          onClick={() => onToggleStatus(law)}
          title="คลิกเพื่อเปลี่ยนสถานะ"
        >
          {togglingId === law.id ? (
            <Loader2 size={14} className={styles.loadingSpin} />
          ) : law.status === "online" ? (
            <Globe size={14} />
          ) : (
            <Power size={14} />
          )}
          <span>{law.status === "online" ? "Online" : "Offline"}</span>
        </div>
      </td>
      <td>
        <div className={styles.actionBtns}>
          <button onClick={() => onEdit(law)} className={styles.editBtn}><Edit size={16} /></button>
          <button onClick={() => onDelete(law.id)} className={styles.deleteBtn}><Trash2 size={16} /></button>
        </div>
      </td>
    </tr>
  );
}

// ===== Main Page Component =====
export default function LawPage() {
  const [activeTab, setActiveTab] = useState(CATEGORIES[0].key);
  const [laws, setLaws] = useState<LawItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [draggingYear, setDraggingYear] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    year: "" as string | number,
    announcedAt: "",
    order: 0 as string | number,
    status: "online",
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [removePdf, setRemovePdf] = useState(false);
  const [existingPdfUrl, setExistingPdfUrl] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ===== Fetch =====
  const fetchLaws = async () => {
    if (!API_URL) return;
    setIsLoading(true);
    try {
      const res = await authFetch(`${API_URL}/laws/${activeTab}`);
      if (!res.ok) { setLaws([]); return; }
      const data = await res.json();
      setLaws(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setLaws([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLaws(); }, [activeTab]);

  // ===== Sorted & Filtered: year DESC → order ASC within year =====
  const sortedLaws = useMemo(() => {
    let result = laws.filter((law) => {
      const q = searchTerm.toLowerCase();
      const matchSearch =
        law.title.toLowerCase().includes(q) ||
        law.order.toString().includes(q) ||
        (law.year && law.year.toString().includes(q)) ||
        (law.announcedAt && law.announcedAt.includes(q));

      const matchStatus = filterStatus === "all" || law.status === filterStatus;

      let matchDate = true;
      if (startDate || endDate) {
        if (!law.announcedAt) {
          matchDate = false;
        } else {
          const d = new Date(law.announcedAt);
          if (startDate) matchDate = matchDate && d >= new Date(startDate);
          if (endDate) matchDate = matchDate && d <= new Date(endDate);
        }
      }

      return matchSearch && matchStatus && matchDate;
    });

    // Sort: year DESC first, then order ASC within the same year
    result.sort((a, b) => {
      const yearA = a.year ?? 0;
      const yearB = b.year ?? 0;
      if (yearB !== yearA) return yearB - yearA; // year DESC
      return b.order - a.order; // order DESC within same year
    });

    return result;
  }, [laws, searchTerm, filterStatus, startDate, endDate]);

  // ===== Drag Start — record which year we're dragging =====
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const draggedItem = sortedLaws.find((l) => l.id === event.active.id);
    if (draggedItem) {
      setDraggingYear(draggedItem.year);
    }
  }, [sortedLaws]);

  // ===== Drag End — reorder within same year only =====
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggingYear(null);

    if (!over || active.id === over.id) return;

    const activeItem = sortedLaws.find((l) => l.id === active.id);
    const overItem = sortedLaws.find((l) => l.id === over.id);

    if (!activeItem || !overItem) return;

    // ห้ามลากข้ามปี
    if (activeItem.year !== overItem.year) {
      const Toast = MySwal.mixin({ toast: true, position: "top-end", showConfirmButton: false, timer: 1500 });
      Toast.fire({ icon: "warning", title: "ไม่สามารถย้ายข้ามปีได้" });
      return;
    }

    // Get items in this year only
    const yearItems = sortedLaws.filter((l) => l.year === activeItem.year);
    const oldIndex = yearItems.findIndex((l) => l.id === active.id);
    const newIndex = yearItems.findIndex((l) => l.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(yearItems, oldIndex, newIndex);

    // Display is DESC, so topmost item gets highest order
    const count = reordered.length;
    const updatedItems = reordered.map((item, idx) => ({ ...item, order: count - idx }));
    setLaws((prev) => {
      const otherYears = prev.filter((l) => l.year !== activeItem.year);
      return [...otherYears, ...updatedItems];
    });

    // Save to backend
    try {
      await authFetch(`${API_URL}/laws/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: updatedItems.map((item) => ({ id: item.id, order: item.order })) }),
      });
      const Toast = MySwal.mixin({ toast: true, position: "top-end", showConfirmButton: false, timer: 1200, timerProgressBar: true });
      Toast.fire({ icon: "success", title: "เปลี่ยนลำดับสำเร็จ" });
    } catch (err) {
      console.error(err);
      fetchLaws(); // rollback
    }
  }, [sortedLaws]);

  // ===== Toggle Status =====
  const handleToggleStatus = async (item: LawItem) => {
    const newStatus = item.status === "online" ? "offline" : "online";
    setTogglingId(item.id);
    try {
      const form = new FormData();
      form.append("status", newStatus);
      const res = await authFetch(`${API_URL}/laws/${item.id}`, { method: "PUT", body: form });
      if (res.ok) {
        setLaws((prev) => prev.map((l) => (l.id === item.id ? { ...l, status: newStatus } : l)));
        const Toast = MySwal.mixin({ toast: true, position: "top-end", showConfirmButton: false, timer: 1500, timerProgressBar: true });
        Toast.fire({ icon: "success", title: `เปลี่ยนสถานะเป็น ${newStatus === "online" ? "ออนไลน์" : "ออฟไลน์"} แล้ว` });
      }
    } catch (err) {
      console.error(err);
      MySwal.fire("Error", "เปลี่ยนสถานะไม่สำเร็จ", "error");
    } finally {
      setTogglingId(null);
    }
  };

  // ===== Edit =====
  const handleEdit = (law: LawItem) => {
    setEditId(law.id);
    setFormData({
      title: law.title,
      year: law.year || "",
      announcedAt: law.announcedAt ? law.announcedAt.split("T")[0] : "",
      order: law.order,
      status: law.status || "online",
    });
    setPdfFile(null);
    setRemovePdf(false);
    setExistingPdfUrl(law.pdfUrl || null);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditId(null);
    setFormData({ title: "", year: "", announcedAt: "", order: 0, status: "online" });
    setPdfFile(null);
    setRemovePdf(false);
    setExistingPdfUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ===== Save =====
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.title) return MySwal.fire({ icon: "warning", title: "ข้อมูลไม่ครบ", text: "กรุณากรอกชื่อกฎหมาย" });
    if (!editId && !pdfFile) return MySwal.fire({ icon: "warning", title: "ข้อมูลไม่ครบ", text: "กรุณาแนบไฟล์ PDF" });

    MySwal.fire({ title: "กำลังบันทึก...", didOpen: () => Swal.showLoading() });

    try {
      const data = new FormData();
      data.append("category", activeTab);
      data.append("title", formData.title);
      data.append("year", formData.year.toString());
      data.append("announcedAt", formData.announcedAt);
      data.append("order", formData.order.toString());
      data.append("status", formData.status);
      if (pdfFile) data.append("pdf", pdfFile);
      if (removePdf) data.append("removePdf", "true");

      const url = editId ? `${API_URL}/laws/${editId}` : `${API_URL}/laws`;
      const res = await authFetch(url, { method: editId ? "PUT" : "POST", body: data });

      if (res.ok) {
        await MySwal.fire({ icon: "success", title: "สำเร็จ!", timer: 1500, showConfirmButton: false });
        handleCancel();
        fetchLaws();
      } else {
        throw new Error("บันทึกไม่สำเร็จ");
      }
    } catch (err: any) {
      MySwal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: err.message });
    }
  };

  // ===== Delete =====
  const handleDelete = async (id: number) => {
    const result = await MySwal.fire({
      title: "ยืนยันการลบ?",
      text: "ข้อมูลจะถูกลบถาวร",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "ลบเลย",
    });
    if (!result.isConfirmed) return;
    await authFetch(`${API_URL}/laws/${id}`, { method: "DELETE" });
    fetchLaws();
    MySwal.fire("ลบสำเร็จ", "", "success");
  };

  // Check if searching/filtering is active (disable DnD when filtering)
  const isFiltering = searchTerm || filterStatus !== "all" || startDate || endDate;

  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>กฎหมาย</h1>
          <p className={styles.pageSubtitle}>จัดการข้อมูลกฎหมายและระเบียบต่าง ๆ</p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className={styles.tabContainer}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={`${styles.tabButton} ${activeTab === cat.key ? styles.tabButtonActive : ""}`}
            onClick={() => { setActiveTab(cat.key); setSearchTerm(""); setFilterStatus("all"); setStartDate(""); setEndDate(""); handleCancel(); }}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="ค้นหาชื่อกฎหมาย, ลำดับ, ปี..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterGroup}>
          <span className={styles.dateLabel}>ประกาศ:</span>
          <input type="date" className={styles.filterInput} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <span style={{ color: "#9ca3af" }}>–</span>
          <input type="date" className={styles.filterInput} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        <select className={styles.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
          <option value="all">สถานะทั้งหมด</option>
          <option value="online">🟢 Online</option>
          <option value="offline">⚪️ Offline</option>
        </select>

        {!isAdding && (
          <button className={styles.addBtn} onClick={() => setIsAdding(true)}>
            <Plus size={18} /> เพิ่มข้อมูลใหม่
          </button>
        )}
      </div>

      {/* Add/Edit Form Mode Modal */}
      {isAdding && (
        <CrudModal
          isOpen={isAdding}
          onClose={handleCancel}
          onSubmit={handleSave}
          title={editId ? "แก้ไขข้อมูล" : "เพิ่มข้อมูลใหม่"}
        >
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>สถานะการแสดงผล</label>
            <select
              className={styles.formSelect}
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="online">🟢 แสดงผล (Online)</option>
              <option value="offline">⚪️ ซ่อน (Offline)</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>ชื่อกฎหมาย <span className={styles.required}>*</span></label>
            <input
              required
              type="text"
              className={styles.formInput}
              placeholder="ระบุชื่อกฎหมาย..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.formLabel}>ลำดับ</label>
              <input
                type="number"
                className={styles.formInput}
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: e.target.value === "" ? "" : parseInt(e.target.value) })}
              />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.formLabel}>ปี พ.ศ.</label>
              <input
                type="number"
                className={styles.formInput}
                placeholder="เช่น 2569"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value === "" ? "" : parseInt(e.target.value) })}
              />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.formLabel}>วันที่ประกาศ</label>
              <input
                type="date"
                className={styles.formInput}
                value={formData.announcedAt}
                onChange={(e) => setFormData({ ...formData, announcedAt: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{editId ? "ไฟล์ PDF" : "แนบไฟล์ PDF *"}</label>
            {/* New file selected */}
            {pdfFile ? (
              <div className={styles.fileUploadBox} onClick={() => fileInputRef.current?.click()}>
                <input type="file" hidden ref={fileInputRef} accept="application/pdf" onChange={(e) => { setPdfFile(e.target.files?.[0] || null); setRemovePdf(false); }} />
                <FileText size={32} style={{ color: "#ef4444" }} />
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>{pdfFile.name}</p>
                  <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setPdfFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  style={{ fontSize: "0.75rem", color: "#ef4444", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                >
                  ยกเลิกไฟล์นี้
                </button>
              </div>
            ) : existingPdfUrl && !removePdf ? (
              /* Existing PDF */
              <div>
                <div className={styles.fileUploadBox} style={{ cursor: "default" }}>
                  <FileText size={32} style={{ color: "#ef4444" }} />
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#374151" }}>ไฟล์ PDF ปัจจุบัน</p>
                    <a href={existingPdfUrl} target="_blank" rel="noreferrer" style={{ fontSize: "0.75rem", color: "#3b82f6" }} onClick={(e) => e.stopPropagation()}>เปิดดูไฟล์</a>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", justifyContent: "center" }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ fontSize: "0.8rem", color: "#3b82f6", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}
                  >
                    <UploadCloud size={14} /> เปลี่ยนไฟล์
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRemovePdf(true); setExistingPdfUrl(null); }}
                    style={{ fontSize: "0.8rem", color: "#ef4444", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem" }}
                  >
                    <Trash2 size={14} /> ลบไฟล์ PDF
                  </button>
                </div>
                <input type="file" hidden ref={fileInputRef} accept="application/pdf" onChange={(e) => { setPdfFile(e.target.files?.[0] || null); setRemovePdf(false); }} />
              </div>
            ) : (
              /* No file */
              <div className={styles.fileUploadBox} onClick={() => fileInputRef.current?.click()}>
                <input type="file" hidden ref={fileInputRef} accept="application/pdf" onChange={(e) => { setPdfFile(e.target.files?.[0] || null); setRemovePdf(false); }} />
                <UploadCloud size={32} style={{ color: "#3b82f6" }} />
                <div>
                  <p className={styles.fileUploadText}>คลิกเพื่ออัปโหลดไฟล์</p>
                  <p className={styles.fileUploadHint}>รองรับไฟล์ PDF (ไม่เกิน 10MB)</p>
                </div>
              </div>
            )}
          </div>
        </CrudModal>
      )}

      {/* Table */}
      <div className={styles.tableContainer}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: "60px", textAlign: "center" }}></th>
                <th style={{ width: "80px", textAlign: "center" }}>ลำดับ</th>
                <th style={{ width: "80px", textAlign: "center" }}>ปี</th>
                <th>ชื่อ</th>
                <th style={{ width: "100px", textAlign: "center" }}>ไฟล์</th>
                <th style={{ width: "140px", textAlign: "center" }}>วันที่ประกาศ</th>
                <th style={{ width: "120px", textAlign: "center" }}>สถานะ</th>
                <th style={{ width: "100px", textAlign: "center" }}>จัดการ</th>
              </tr>
            </thead>
            <SortableContext items={sortedLaws.map((l) => l.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {!isLoading && sortedLaws.length === 0 && (
                  <tr>
                    <td colSpan={8} className={styles.emptyState}>
                      ไม่พบข้อมูลกฎหมายในหมวดนี้
                    </td>
                  </tr>
                )}
                {!isLoading && sortedLaws.map((law) => (
                  <SortableRow
                    key={law.id}
                    law={law}
                    togglingId={togglingId}
                    onToggleStatus={handleToggleStatus}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isDragDisabled={!!isFiltering || (draggingYear !== null && law.year !== draggingYear)}
                  />
                ))}
                {isLoading && (
                  <tr>
                    <td colSpan={8} className={styles.emptyState}>
                      <Loader2 size={24} className={styles.loadingSpin} style={{ margin: "0 auto" }} />
                    </td>
                  </tr>
                )}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>
    </div>
  );
}

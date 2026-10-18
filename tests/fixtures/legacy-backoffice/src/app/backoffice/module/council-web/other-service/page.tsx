// src/app/backoffice/module/council-web/other-service/page.tsx
"use client";

import {
  Save, Plus, Trash2, FileText, Download, UploadCloud, Edit,
  Globe, Power, Loader2, Search, GripVertical, X, Eye, EyeOff
} from "lucide-react";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import styles from "./other-service.module.css";
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

interface CategoryItem {
  id: number;
  name: string;
  order: number;
  itemCount?: number;
}

interface ServiceItem {
  id: number;
  categoryId: number;
  name: string;
  status: string; // online | offline
  pdfUrl: string | null;
  order: number;
}

// ===== Sortable Item Row Component =====
function SortableRow({
  item,
  onEdit,
  onDelete,
  onToggleStatus,
  isDragDisabled,
}: {
  item: ServiceItem;
  onEdit: (item: ServiceItem) => void;
  onDelete: (id: number) => void;
  onToggleStatus: (item: ServiceItem) => void;
  isDragDisabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: isDragDisabled });

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
      className={`${styles.tableRow} ${item.status === "offline" ? styles.rowOffline : ""}`}
    >
      <td style={{ textAlign: "center", width: "50px" }}>
        <span
          {...attributes}
          {...listeners}
          className={`${styles.dragHandle} ${isDragDisabled ? styles.dragDisabled : ""}`}
          title="ลากเพื่อเปลี่ยนลำดับ"
        >
          <GripVertical size={16} />
        </span>
      </td>
      <td style={{ textAlign: "center", width: "60px", fontWeight: 500, color: "#6b7280" }}>{item.order}</td>
      <td style={{ fontWeight: 600, color: "#1f2937" }}>{item.name}</td>
      <td style={{ textAlign: "center", width: "120px" }}>
        {item.pdfUrl ? (
          <a href={item.pdfUrl} target="_blank" rel="noreferrer" className={styles.pdfLink}>
            <Download size={16} /> ดูไฟล์ PDF
          </a>
        ) : (
          <span style={{ color: "#d1d5db" }}>ไม่มีไฟล์</span>
        )}
      </td>
      <td style={{ textAlign: "center", width: "120px" }}>
        <span className={`${styles.badge} ${item.status === "online" ? styles.badgeOnline : styles.badgeOffline}`}>
          {item.status === "online" ? <Eye size={12} /> : <EyeOff size={12} />}
          {item.status === "online" ? "แสดงบนเว็บ" : "ซ่อน"}
        </span>
      </td>
      <td style={{ textAlign: "center", width: "120px" }}>
        <div className={styles.btnActions}>
          <button onClick={() => onToggleStatus(item)} className={styles.actionIconBtn} title={item.status === "online" ? "ซ่อนบริการ" : "เปิดแสดงบริการ"}>
            <Power size={16} color={item.status === "online" ? "#22c55e" : "#6b7280"} />
          </button>
          <button onClick={() => onEdit(item)} className={styles.actionIconBtn} title="แก้ไข">
            <Edit size={16} />
          </button>
          <button onClick={() => onDelete(item.id)} className={`${styles.actionIconBtn} ${styles.btnDanger}`} title="ลบ">
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ===== Sortable Category List Item Component =====
function SortableCategoryItem({
  category,
  activeId,
  onClick,
  onEdit,
  onDelete,
}: {
  category: CategoryItem;
  activeId: number | null;
  onClick: () => void;
  onEdit: (cat: CategoryItem) => void;
  onDelete: (id: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  };

  const isActive = activeId === category.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.categoryItem} ${isActive ? styles.categoryItemActive : ""}`}
      onClick={onClick}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flex: 1, minWidth: 0 }}>
        <span {...attributes} {...listeners} className={styles.dragHandle} style={{ padding: "4px" }}>
          <GripVertical size={14} />
        </span>
        <span className={styles.categoryName} title={category.name}>
          {category.name}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center" }}>
        <span className={styles.categoryCount}>{category.itemCount || 0}</span>
        <div className={styles.categoryActions}>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(category); }}
            className={styles.actionIconBtn}
            title="แก้ไขชื่อหมวดหมู่"
          >
            <Edit size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(category.id); }}
            className={`${styles.actionIconBtn} ${styles.btnDanger}`}
            title="ลบหมวดหมู่"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Main Component =====
export default function OtherServicesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryEditData, setCategoryEditData] = useState<CategoryItem | null>(null);
  const [categoryName, setCategoryName] = useState("");

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [itemEditData, setItemEditData] = useState<ServiceItem | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemStatus, setItemStatus] = useState("online");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [existingPdfUrl, setExistingPdfUrl] = useState<string | null>(null);
  const [removePdf, setRemovePdf] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // DnD kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Load categories
  const fetchCategories = useCallback(async (selectIdAfterLoad?: number) => {
    setIsLoadingCategories(true);
    try {
      const res = await authFetch(`${API_URL}/other-service-categories/with-count`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        if (data.length > 0) {
          if (selectIdAfterLoad) {
            setActiveCategoryId(selectIdAfterLoad);
          } else if (activeCategoryId === null || !data.some((c: CategoryItem) => c.id === activeCategoryId)) {
            setActiveCategoryId(data[0].id);
          }
        } else {
          setActiveCategoryId(null);
          setItems([]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingCategories(false);
    }
  }, [activeCategoryId]);

  // Load items
  const fetchItems = useCallback(async (catId: number) => {
    setIsLoadingItems(true);
    try {
      const res = await authFetch(`${API_URL}/other-service-items/${catId}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (activeCategoryId !== null) {
      fetchItems(activeCategoryId);
    }
  }, [activeCategoryId, fetchItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [items, searchTerm]);

  // =============================================================
  // CATEGORY OPERATIONS
  // =============================================================
  const handleOpenAddCategory = () => {
    setCategoryEditData(null);
    setCategoryName("");
    setIsCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (cat: CategoryItem) => {
    setCategoryEditData(cat);
    setCategoryName(cat.name);
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) {
      MySwal.fire("กรุณากรอกชื่อหมวดหมู่", "", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      let res;
      if (categoryEditData) {
        // Edit
        res = await authFetch(`${API_URL}/other-service-categories/${categoryEditData.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: categoryName.trim() }),
        });
      } else {
        // Create
        res = await authFetch(`${API_URL}/other-service-categories`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: categoryName.trim() }),
        });
      }

      if (res.ok) {
        const resData = await res.json();
        const selectedId = categoryEditData ? categoryEditData.id : resData.category?.id;
        await fetchCategories(selectedId);
        setIsCategoryModalOpen(false);
        MySwal.fire({
          icon: "success",
          title: "บันทึกหมวดหมู่สำเร็จ",
          showConfirmButton: false,
          timer: 1500,
        });
      } else {
        const err = await res.json();
        MySwal.fire("เกิดข้อผิดพลาด", err.message || "ล้มเหลว", "error");
      }
    } catch (e: any) {
      MySwal.fire("เกิดข้อผิดพลาด", e.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    const resConfirm = await MySwal.fire({
      title: "ยืนยันการลบหมวดหมู่?",
      text: "การลบหมวดหมู่จะลบไฟล์บริการทั้งหมดภายในหมวดนี้ด้วยและไม่สามารถกู้คืนได้!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "ลบข้อมูล",
      cancelButtonText: "ยกเลิก",
    });

    if (resConfirm.isConfirmed) {
      try {
        const res = await authFetch(`${API_URL}/other-service-categories/${id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          if (activeCategoryId === id) {
            setActiveCategoryId(null);
          }
          await fetchCategories();
          MySwal.fire("ลบสำเร็จ", "", "success");
        } else {
          MySwal.fire("เกิดข้อผิดพลาด", "ไม่สามารถลบข้อมูลได้", "error");
        }
      } catch (e: any) {
        MySwal.fire("เกิดข้อผิดพลาด", e.message, "error");
      }
    }
  };

  const handleDragEndCategory = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);

    const updated = arrayMove(categories, oldIndex, newIndex);
    setCategories(updated);

    // Save order
    try {
      const itemsToSave = updated.map((c, i) => ({ id: c.id, order: i }));
      await authFetch(`${API_URL}/other-service-categories/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToSave }),
      });
    } catch (e) {
      console.error("Failed to save reordered categories:", e);
    }
  };


  // =============================================================
  // SERVICE ITEM OPERATIONS
  // =============================================================
  const handleOpenAddItem = () => {
    if (activeCategoryId === null) {
      MySwal.fire("กรุณาเลือกหรือสร้างหมวดหมู่ก่อน", "", "warning");
      return;
    }
    setItemEditData(null);
    setItemName("");
    setItemStatus("online");
    setPdfFile(null);
    setExistingPdfUrl(null);
    setRemovePdf(false);
    setIsItemModalOpen(true);
  };

  const handleOpenEditItem = (item: ServiceItem) => {
    setItemEditData(item);
    setItemName(item.name);
    setItemStatus(item.status);
    setPdfFile(null);
    setExistingPdfUrl(item.pdfUrl);
    setRemovePdf(false);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async () => {
    if (!itemName.trim()) {
      MySwal.fire("กรุณากรอกชื่อบริการ", "", "warning");
      return;
    }
    if (!itemEditData && !pdfFile) {
      MySwal.fire("กรุณาอัปโหลดไฟล์ PDF", "", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("name", itemName.trim());
      formData.append("status", itemStatus);
      if (activeCategoryId !== null) {
        formData.append("categoryId", activeCategoryId.toString());
      }

      if (pdfFile) {
        formData.append("pdfFile", pdfFile);
      }
      if (removePdf) {
        formData.append("removePdf", "true");
      }

      let res;
      if (itemEditData) {
        res = await authFetch(`${API_URL}/other-service-items/${itemEditData.id}`, {
          method: "PUT",
          body: formData,
        });
      } else {
        res = await authFetch(`${API_URL}/other-service-items`, {
          method: "POST",
          body: formData,
        });
      }

      if (res.ok) {
        if (activeCategoryId !== null) {
          await fetchItems(activeCategoryId);
          // Refresh counts in category sidebar
          const countsRes = await authFetch(`${API_URL}/other-service-categories/with-count`);
          if (countsRes.ok) {
            setCategories(await countsRes.json());
          }
        }
        setIsItemModalOpen(false);
        MySwal.fire({
          icon: "success",
          title: "บันทึกบริการสำเร็จ",
          showConfirmButton: false,
          timer: 1500,
        });
      } else {
        const err = await res.json();
        MySwal.fire("เกิดข้อผิดพลาด", err.message || "ล้มเหลว", "error");
      }
    } catch (e: any) {
      MySwal.fire("เกิดข้อผิดพลาด", e.message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    const resConfirm = await MySwal.fire({
      title: "ยืนยันการลบไฟล์บริการ?",
      text: "ข้อมูลนี้จะถูกลบออกถาวรและไม่สามารถกู้คืนได้!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "ลบข้อมูล",
      cancelButtonText: "ยกเลิก",
    });

    if (resConfirm.isConfirmed) {
      try {
        const res = await authFetch(`${API_URL}/other-service-items/${id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          if (activeCategoryId !== null) {
            await fetchItems(activeCategoryId);
            // Refresh counts in category sidebar
            const countsRes = await authFetch(`${API_URL}/other-service-categories/with-count`);
            if (countsRes.ok) {
              setCategories(await countsRes.json());
            }
          }
          MySwal.fire("ลบสำเร็จ", "", "success");
        } else {
          MySwal.fire("เกิดข้อผิดพลาด", "ไม่สามารถลบข้อมูลได้", "error");
        }
      } catch (e: any) {
        MySwal.fire("เกิดข้อผิดพลาด", e.message, "error");
      }
    }
  };

  const handleToggleStatus = async (item: ServiceItem) => {
    const newStatus = item.status === "online" ? "offline" : "online";
    try {
      const formData = new FormData();
      formData.append("status", newStatus);

      const res = await authFetch(`${API_URL}/other-service-items/${item.id}`, {
        method: "PUT",
        body: formData,
      });

      if (res.ok) {
        if (activeCategoryId !== null) {
          await fetchItems(activeCategoryId);
        }
        const Toast = Swal.mixin({
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 1500,
        });
        Toast.fire({
          icon: "success",
          title: newStatus === "online" ? "เปิดแสดงผลแล้ว" : "ซ่อนแล้ว",
        });
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDragEndItem = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);

    const updated = arrayMove(items, oldIndex, newIndex);
    setItems(updated);

    try {
      const itemsToSave = updated.map((item, index) => ({ id: item.id, order: index }));
      await authFetch(`${API_URL}/other-service-items/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToSave }),
      });
    } catch (e) {
      console.error("Failed to save reordered items:", e);
    }
  };

  const activeCategoryName = useMemo(() => {
    return categories.find(c => c.id === activeCategoryId)?.name || "ไม่มีข้อมูลหมวดหมู่";
  }, [categories, activeCategoryId]);

  return (
    <div className={styles.wrapper}>
      {/* HEADER */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>จัดการบริการอื่นๆ (Other Services)</h2>
          <p className={styles.pageSubtitle}>สร้างหมวดหมู่การบริการและอัปโหลดไฟล์ PDF คู่มือ/แบบฟอร์มเพื่อแสดงหน้าเว็บไซต์</p>
        </div>
      </div>

      {/* TWO-COLUMN LAYOUT */}
      <div className={styles.layout}>
        {/* SIDEBAR: Categories */}
        <div className={styles.sidebarCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 className={styles.sidebarTitle}>หมวดหมู่ทั้งหมด</h3>
            <button onClick={handleOpenAddCategory} className={styles.actionIconBtn} title="เพิ่มหมวดหมู่">
              <Plus size={20} />
            </button>
          </div>

          {isLoadingCategories ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
              <Loader2 size={24} className="animate-spin text-blue-500" />
            </div>
          ) : categories.length === 0 ? (
            <div style={{ textAlign: "center", padding: "1.5rem 0", color: "#9ca3af", fontSize: "0.9rem" }}>
              ยังไม่มีหมวดหมู่
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndCategory}>
              <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                <div className={styles.categoryList}>
                  {categories.map((cat) => (
                    <SortableCategoryItem
                      key={cat.id}
                      category={cat}
                      activeId={activeCategoryId}
                      onClick={() => setActiveCategoryId(cat.id)}
                      onEdit={handleOpenEditCategory}
                      onDelete={handleDeleteCategory}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* MAIN BOARD: Service items within active category */}
        <div className={styles.mainCard}>
          {activeCategoryId === null ? (
            <div className={styles.emptyState}>
              <FileText size={48} />
              <p className={styles.emptyText}>เลือกหมวดหมู่ทางซ้ายเพื่อแสดงรายการ หรือเพิ่มหมวดหมู่ใหม่</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className={styles.cardHeader}>
                <div>
                  <h3 className={styles.cardTitle}>หมวดหมู่: {activeCategoryName}</h3>
                </div>
                <button onClick={handleOpenAddItem} className={styles.btnPrimary}>
                  <Plus size={16} />
                  <span>เพิ่มไฟล์บริการ</span>
                </button>
              </div>

              {/* Toolbar */}
              <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                  <Search size={16} className={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="ค้นหาชื่อบริการ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
              </div>

              {/* Items Table with DnD support */}
              {isLoadingItems ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
                  <Loader2 size={32} className="animate-spin text-blue-500" />
                </div>
              ) : items.length === 0 ? (
                <div className={styles.emptyState}>
                  <FileText size={40} />
                  <p className={styles.emptyText}>ยังไม่มีรายการไฟล์บริการในหมวดหมู่นี้</p>
                </div>
              ) : (
                <div className={styles.tableContainer}>
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndItem}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th style={{ width: "50px", textAlign: "center" }}></th>
                          <th style={{ width: "60px", textAlign: "center" }}>ลำดับ</th>
                          <th>ชื่อบริการ</th>
                          <th style={{ width: "120px", textAlign: "center" }}>ดาวน์โหลด</th>
                          <th style={{ width: "120px", textAlign: "center" }}>สถานะ</th>
                          <th style={{ width: "120px", textAlign: "center" }}>จัดการ</th>
                        </tr>
                      </thead>
                      <SortableContext items={filteredItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                        <tbody>
                          {filteredItems.map((item) => (
                            <SortableRow
                              key={item.id}
                              item={item}
                              onEdit={handleOpenEditItem}
                              onDelete={handleDeleteItem}
                              onToggleStatus={handleToggleStatus}
                              isDragDisabled={!!searchTerm}
                            />
                          ))}
                        </tbody>
                      </SortableContext>
                    </table>
                  </DndContext>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* =============================================================
          MODALS
          ============================================================= */}

      {/* 1. CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <CrudModal
          title={categoryEditData ? "แก้ไขชื่อหมวดหมู่" : "เพิ่มหมวดหมู่ใหม่"}
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          onSubmit={(e) => { e.preventDefault(); handleSaveCategory(); }}
        >
          <div className={styles.formGroup}>
            <label className={styles.label}>
              ชื่อหมวดหมู่ <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="กรอกชื่อหมวดหมู่ เช่น คณะอนุกรรมการฯ"
              className={styles.input}
              required
            />
          </div>
        </CrudModal>
      )}

      {/* 2. ITEM MODAL */}
      {isItemModalOpen && (
        <CrudModal
          title={itemEditData ? "แก้ไขข้อมูลไฟล์บริการ" : "เพิ่มไฟล์บริการใหม่"}
          isOpen={isItemModalOpen}
          onClose={() => setIsItemModalOpen(false)}
          onSubmit={(e) => { e.preventDefault(); handleSaveItem(); }}
        >
          <div className={styles.formGroup}>
            <label className={styles.label}>
              ชื่อบริการ <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="ระบุชื่อบริการสำหรับแสดงหน้าเว็บ"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>สถานะการแสดงผล</label>
            <select
              value={itemStatus}
              onChange={(e) => setItemStatus(e.target.value)}
              className={styles.select}
            >
              <option value="online">แสดงบนเว็บไซต์ (Online)</option>
              <option value="offline">ซ่อนการแสดงผล (Offline)</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>{itemEditData ? "ไฟล์ PDF" : "แนบไฟล์ PDF *"}</label>
            
            {pdfFile ? (
              <div className={styles.fileUploadArea} onClick={() => fileInputRef.current?.click()}>
                <input type="file" hidden ref={fileInputRef} accept="application/pdf" onChange={(e) => { setPdfFile(e.target.files?.[0] || null); setRemovePdf(false); }} />
                <div className={styles.fileUploadContent}>
                  <FileText size={36} className={styles.fileIcon} style={{ color: "#ef4444" }} />
                  <div>
                    <p className={styles.fileName}>{pdfFile.name}</p>
                    <p className={styles.fileSize}>{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPdfFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    className={styles.fileRemoveBtn}
                  >
                    ยกเลิกไฟล์นี้
                  </button>
                </div>
              </div>
            ) : existingPdfUrl && !removePdf ? (
              <div>
                <div className={styles.fileUploadArea} style={{ cursor: "default" }}>
                  <div className={styles.fileUploadContent}>
                    <FileText size={36} style={{ color: "#ef4444" }} />
                    <div>
                      <p className={styles.fileName}>ไฟล์ PDF ปัจจุบันในระบบ</p>
                      <a href={existingPdfUrl} target="_blank" rel="noreferrer" style={{ fontSize: "0.8rem", color: "#3b82f6", fontWeight: 600 }} onClick={(e) => e.stopPropagation()}>เปิดดูไฟล์ปัจจุบัน</a>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem", justifyContent: "center" }}>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ fontSize: "0.8rem", color: "#3b82f6", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem", fontWeight: 600 }}
                  >
                    <UploadCloud size={14} /> เปลี่ยนไฟล์ใหม่
                  </button>
                  <button
                    type="button"
                    onClick={() => { setRemovePdf(true); setExistingPdfUrl(null); }}
                    style={{ fontSize: "0.8rem", color: "#ef4444", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.25rem", fontWeight: 600 }}
                  >
                    <Trash2 size={14} /> ลบไฟล์ออก
                  </button>
                </div>
                <input type="file" hidden ref={fileInputRef} accept="application/pdf" onChange={(e) => { setPdfFile(e.target.files?.[0] || null); setRemovePdf(false); }} />
              </div>
            ) : (
              <div className={styles.fileUploadArea} onClick={() => fileInputRef.current?.click()}>
                <input type="file" hidden ref={fileInputRef} accept="application/pdf" onChange={(e) => { setPdfFile(e.target.files?.[0] || null); setRemovePdf(false); }} />
                <div className={styles.fileUploadContent}>
                  <UploadCloud size={36} className={styles.fileIcon} />
                  <div>
                    <p className={styles.fileName}>คลิกเพื่อเลือกไฟล์ PDF</p>
                    <p className={styles.fileSize}>รองรับเฉพาะไฟล์ PDF ขนาดไม่เกิน 10MB</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CrudModal>
      )}
    </div>
  );
}

// src/app/backoffice/module/council-web/service/service-e/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Edit,
  Trash2,
  Plus,
  Search,
  GripVertical,
  Upload,
  UploadCloud,
  Image as ImageIcon,
  Star,
  ExternalLink,
  ZoomIn,
  X,
  FileText,
} from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import styles from "./service-e.module.css";
import { authFetch } from "@/app/utils/authFetch";
import CrudModal from "@/app/components/ui/CrudModal";

const MySwal = withReactContent(Swal);
const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface ServiceItem {
  id: number;
  name: string;
  shortName?: string | null;
  iconUrl?: string | null;
  order: number;
  description?: string | null;
  linkUrl?: string | null;
  isPopular: boolean;
  popularOrder: number;
}

export default function ServiceEPage() {
  const [items, setItems] = useState<ServiceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Sorting
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Drag and Drop
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [viewingDetail, setViewingDetail] = useState<{ name: string; text: string } | null>(null);

  // Form
  const [formData, setFormData] = useState<{
    name: string;
    shortName: string;
    description: string;
    linkUrl: string;
    order: number | string;
    isPopular: boolean;
    popularOrder: number | string;
    iconFile: File | null;
    iconPreview: string | null;
  }>({
    name: "",
    shortName: "",
    description: "",
    linkUrl: "",
    order: 1,
    isPopular: false,
    popularOrder: 0,
    iconFile: null,
    iconPreview: null,
  });

  // Drag and drop handlers
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

    const newItems = items.map((m) => {
      const payloadMatch = payload.find((p) => p.id === m.id);
      if (payloadMatch) return { ...m, order: payloadMatch.order };
      return m;
    });

    setItems(newItems);
    dragItem.current = null;
    dragOverItem.current = null;

    try {
      MySwal.fire({
        title: "กำลังบันทึกการจัดเรียง...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
      const res = await authFetch(`${API_URL}/services/reorder`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      MySwal.close();
      const Toast = Swal.mixin({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 1200,
      });
      Toast.fire({ icon: "success", title: "จัดเรียงสำเร็จ" });
    } catch (err) {
      console.error(err);
      MySwal.fire("Error", "เกิดข้อผิดพลาดในการบันทึกลำดับ", "error");
      fetchItems();
    }
  };

  const fetchItems = async () => {
    try {
      const res = await authFetch(`${API_URL}/services`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setItems(data);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          item.name.toLowerCase().includes(searchLower) ||
          (item.shortName || "").toLowerCase().includes(searchLower) ||
          (item.description || "").toLowerCase().includes(searchLower)
        );
      })
      .sort((a, b) => {
        if (sortDirection === "asc") return a.order - b.order;
        return b.order - a.order;
      });
  }, [items, searchTerm, sortDirection]);

  const handleSort = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };
  const getSortIcon = () => (sortDirection === "asc" ? "↑" : "↓");

  const onSelectIcon = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const iconUrl = URL.createObjectURL(file);
      setFormData((prev) => ({
        ...prev,
        iconFile: file,
        iconPreview: iconUrl,
      }));
      e.target.value = "";
    }
  };

  const openModal = (item?: ServiceItem) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        name: item.name,
        shortName: item.shortName || "",
        description: item.description || "",
        linkUrl: item.linkUrl || "",
        order: item.order,
        isPopular: item.isPopular || false,
        popularOrder: item.popularOrder || 0,
        iconFile: null,
        iconPreview: item.iconUrl || null,
      });
    } else {
      setEditingId(null);
      const maxOrder = items.length > 0 ? Math.max(...items.map((m) => m.order)) : 0;
      setFormData({
        name: "",
        shortName: "",
        description: "",
        linkUrl: "",
        order: maxOrder + 1,
        isPopular: false,
        popularOrder: 0,
        iconFile: null,
        iconPreview: null,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    MySwal.fire({
      title: "กำลังบันทึก...",
      didOpen: () => Swal.showLoading(),
    });
    try {
      const form = new FormData();
      form.append("name", formData.name);
      form.append("shortName", formData.shortName);
      form.append("description", formData.description);
      form.append("linkUrl", formData.linkUrl);
      form.append("order", formData.order.toString());
      form.append("isPopular", formData.isPopular.toString());
      form.append("popularOrder", formData.popularOrder.toString());
      if (formData.iconFile) form.append("icon", formData.iconFile);

      const url = editingId
        ? `${API_URL}/services/${editingId}`
        : `${API_URL}/services`;
      const method = editingId ? "PUT" : "POST";

      const res = await authFetch(url, { method, body: form });
      if (res.ok) {
        await MySwal.fire("สำเร็จ", "บันทึกข้อมูลเรียบร้อย", "success");
        setIsModalOpen(false);
        fetchItems();
      } else {
        throw new Error();
      }
    } catch (err) {
      MySwal.fire("Error", "เกิดข้อผิดพลาด", "error");
    }
  };

  const handleDelete = async (id: number) => {
    const confirm = await MySwal.fire({
      title: "ยืนยันการลบ?",
      text: "ข้อมูลจะถูกลบถาวร",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "ลบข้อมูล",
    });

    if (confirm.isConfirmed) {
      await authFetch(`${API_URL}/services/${id}`, { method: "DELETE" });
      fetchItems();
      MySwal.fire("ลบสำเร็จ", "", "success");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>จัดการข้อมูลบริการ</h1>
          <p className={styles.subtitle}>
            รายการบริการทั้งหมด (บริการเด่นสูงสุด 4 รายการ)
          </p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="ค้นหาชื่อบริการ, ชื่อย่อ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button onClick={() => openModal()} className={styles.btnAdd}>
          <Plus size={20} /> เพิ่มบริการใหม่
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
                <th className={`${styles.tableTh} text-center w-24`}>ไอคอน</th>
                <th className={styles.tableTh}>ชื่อบริการ</th>
                <th className={styles.tableTh}>ชื่อย่อ</th>
                <th className={`${styles.tableTh} text-center`}>รายละเอียด</th>
                <th className={styles.tableTh}>ลิงก์</th>
                <th className={`${styles.tableTh} text-center`}>บริการเด่น</th>
                <th className={`${styles.tableTh} text-center w-20`}>ลำดับเด่น</th>
                <th className={`${styles.tableTh} text-center w-24`}>จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-gray-400">
                    ยังไม่มีข้อมูล
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
                    {/* 1. ลำดับ */}
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

                    {/* 2. ไอคอน */}
                    <td className={styles.tableTd}>
                      <div className={styles.iconCell}>
                        <div
                          className={`${styles.iconContainer} ${item.iconUrl ? styles.clickableIcon : ""}`}
                          onClick={() => {
                            if (item.iconUrl) setPreviewImage(item.iconUrl);
                          }}
                        >
                          {item.iconUrl ? (
                            <>
                              <img
                                src={item.iconUrl}
                                alt={item.name}
                                className={styles.iconImg}
                              />
                              <div className={styles.zoomOverlay}>
                                <ZoomIn size={14} />
                              </div>
                            </>
                          ) : (
                            <ImageIcon size={20} className={styles.iconPlaceholder} />
                          )}
                        </div>
                        {item.iconUrl && (
                          <span
                            className={styles.viewImageLabel}
                            onClick={() => setPreviewImage(item.iconUrl!)}
                          >
                            <ZoomIn size={12} /> ดูภาพเต็ม
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. ชื่อบริการ */}
                    <td className={`${styles.tableTd} font-medium text-gray-900`}>
                      {item.name}
                    </td>

                    {/* 4. ชื่อย่อ */}
                    <td className={`${styles.tableTd} text-gray-600`}>
                      {item.shortName || "-"}
                    </td>

                    {/* 5. รายละเอียด */}
                    <td className={`${styles.tableTd} text-center`}>
                      {item.description && item.description.trim() !== "" ? (
                        <button
                          type="button"
                          className={styles.btnReadDetail}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setViewingDetail({
                              name: item.name,
                              text: item.description!,
                            });
                          }}
                        >
                          <FileText size={14} /> อ่านรายละเอียด
                        </button>
                      ) : (
                        <span className={styles.btnReadDetailDisabled}>-</span>
                      )}
                    </td>

                    {/* 6. ลิงก์ */}
                    <td className={styles.tableTd}>
                      {item.linkUrl ? (
                        <a
                          href={item.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.linkText}
                          title={item.linkUrl}
                        >
                          <ExternalLink size={12} style={{ display: "inline", marginRight: 4 }} />
                          {item.linkUrl}
                        </a>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>

                    {/* 7. บริการเด่น */}
                    <td className={`${styles.tableTd} text-center`}>
                      <span
                        className={`${styles.popularBadge} ${item.isPopular ? styles.popularYes : styles.popularNo}`}
                      >
                        {item.isPopular ? (
                          <>
                            <Star size={12} /> เด่น
                          </>
                        ) : (
                          "ทั่วไป"
                        )}
                      </span>
                    </td>

                    {/* 8. ลำดับเด่น */}
                    <td className={`${styles.tableTd} text-center text-gray-500`}>
                      {item.isPopular ? item.popularOrder : "-"}
                    </td>

                    {/* 9. จัดการ */}
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

      {/* ==================== Icon Preview (small) ==================== */}
      {previewImage && (
        <div className={styles.iconPreviewOverlay} onClick={() => setPreviewImage(null)}>
          <div className={styles.iconPreviewContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.iconPreviewClose} onClick={() => setPreviewImage(null)}>
              <X size={18} />
            </button>
            <img src={previewImage} alt="Icon Preview" />
          </div>
        </div>
      )}

      {/* ==================== Detail Modal ==================== */}
      {viewingDetail && (
        <CrudModal
          isOpen={true}
          onClose={() => setViewingDetail(null)}
          onSubmit={(e) => { e.preventDefault(); setViewingDetail(null); }}
          title={`📋 รายละเอียดบริการ: ${viewingDetail.name}`}
        >
          <div className={styles.detailContent}>{viewingDetail.text}</div>
        </CrudModal>
      )}

      {/* ==================== CRUD Modal ==================== */}
      {isModalOpen && (
        <CrudModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          title={editingId ? "แก้ไขข้อมูลบริการ" : "เพิ่มข้อมูลบริการใหม่"}
        >
          {/* Icon Upload */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>ไอคอนบริการ</label>
            {formData.iconPreview ? (
              <div style={{ textAlign: "center" }}>
                <label className={styles.iconUploadArea}>
                  <img
                    src={formData.iconPreview}
                    alt="Preview"
                    className={styles.iconPreviewImg}
                  />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onSelectIcon}
                    hidden
                  />
                </label>
                <div className={styles.changeIconRow}>
                  <label className={styles.changeIconBtn}>
                    <Upload size={14} /> เปลี่ยนไอคอน
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onSelectIcon}
                      hidden
                    />
                  </label>
                </div>
              </div>
            ) : (
              <label className={styles.iconUploadArea}>
                <div className={styles.iconUploadPlaceholder}>
                  <UploadCloud size={28} />
                  <span>อัปโหลดไอคอน</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={onSelectIcon}
                  hidden
                />
              </label>
            )}
          </div>

          {/* ชื่อบริการ */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>ชื่อบริการ *</label>
            <input
              className={styles.formInput}
              placeholder="กรอกชื่อบริการ"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />
          </div>

          {/* ชื่อย่อ */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>ชื่อย่อ</label>
            <textarea
              className={styles.formTextarea}
              placeholder="เช่น สภ.12 หรือชื่อสั้นของบริการ"
              rows={2}
              value={formData.shortName}
              onChange={(e) =>
                setFormData({ ...formData, shortName: e.target.value })
              }
            />
          </div>

          {/* ลำดับ */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>ลำดับ</label>
            <input
              type="number"
              className={styles.formInput}
              value={formData.order}
              onChange={(e) =>
                setFormData({ ...formData, order: e.target.value })
              }
            />
          </div>

          {/* รายละเอียด */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>รายละเอียด</label>
            <textarea
              className={styles.formTextarea}
              placeholder="กรอกรายละเอียดของบริการ"
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          {/* Link URL */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Link URL</label>
            <input
              className={styles.formInput}
              placeholder="https://..."
              value={formData.linkUrl}
              onChange={(e) =>
                setFormData({ ...formData, linkUrl: e.target.value })
              }
            />
          </div>

          {/* Popular Toggle + Popular Order */}
          <div className={styles.gridTwo}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>บริการเด่น</label>
              <div className={styles.toggleGroup}>
                <button
                  type="button"
                  className={`${styles.toggleSwitch} ${formData.isPopular ? styles.toggleSwitchActive : ""}`}
                  onClick={() =>
                    setFormData({ ...formData, isPopular: !formData.isPopular })
                  }
                >
                  <span
                    className={`${styles.toggleKnob} ${formData.isPopular ? styles.toggleKnobActive : ""}`}
                  />
                </button>
                <span className={styles.toggleLabel}>
                  {formData.isPopular ? "เปิด" : "ปิด"}
                </span>
              </div>
            </div>
            {formData.isPopular && (
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>ลำดับบริการเด่น</label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={formData.popularOrder}
                  onChange={(e) =>
                    setFormData({ ...formData, popularOrder: e.target.value })
                  }
                  min={1}
                  max={4}
                />
              </div>
            )}
          </div>
        </CrudModal>
      )}
    </div>
  );
}
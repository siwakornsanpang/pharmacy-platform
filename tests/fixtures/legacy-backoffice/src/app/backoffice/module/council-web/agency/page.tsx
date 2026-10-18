"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, Edit, Trash2, Search, GripVertical, Upload, Image as ImageIcon,
  ArrowUpDown, ExternalLink, X, ZoomIn, ZoomOut, FileText
} from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import Cropper from "react-easy-crop";
import { authFetch } from "@/app/utils/authFetch";
import CrudModal from "@/app/components/ui/CrudModal";
import styles from "./agency.module.css";

const MySwal = withReactContent(Swal);
const API_URL = process.env.NEXT_PUBLIC_API_URL;

// ===== Category Tabs =====
const CATEGORIES = [
  { key: "supervised", label: "หน่วยงานในกำกับ", icon: "🏛️" },
  { key: "college", label: "วิทยาลัย", icon: "🎓" },
  { key: "sample_data", label: "สถาบันเภสัช", icon: "📋" },
  { key: "professional_network", label: "เครือข่ายวิชาชีพ", icon: "🤝" },
  { key: "institution", label: "สถาบันการศึกษา", icon: "📚" },
  { key: "other", label: "หน่วยงานอื่น", icon: "📂" },
];

interface AgencyItem {
  id: number;
  order: number;
  name: string;
  title: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  originalThumbnailUrl: string | null;
  logoUrl: string | null;
  iconUrl: string | null;
  url: string;
  category: string;
}

// ===== Crop helper =====
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.src = url;
  });
}
async function getCroppedImg(imageSrc: string, pixelCrop: any): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
    0, 0, pixelCrop.width, pixelCrop.height
  );
  return new Promise((resolve) =>
    canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.95)
  );
}

export default function AgencyPage() {
  // ===== State =====
  const [items, setItems] = useState<AgencyItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(CATEGORIES[0].key);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Track which images to remove
  const [removedImages, setRemovedImages] = useState<{
    thumbnail: boolean; logo: boolean; icon: boolean;
  }>({ thumbnail: false, logo: false, icon: false });

  // Form
  const [formData, setFormData] = useState<{
    name: string;
    title: string;
    description: string;
    url: string;
    order: number | string;
    // Thumbnail (3:2 crop — matches website hero card)
    thumbnailFile: File | null;
    originalThumbnailFile: File | null;
    thumbnailPreview: string | null;
    originalThumbnailPreview: string | null;
    // Logo (no crop)
    logoFile: File | null;
    logoPreview: string | null;
    // Icon (no crop)
    iconFile: File | null;
    iconPreview: string | null;
  }>({
    name: "", title: "", description: "", url: "", order: 1,
    thumbnailFile: null, originalThumbnailFile: null,
    thumbnailPreview: null, originalThumbnailPreview: null,
    logoFile: null, logoPreview: null,
    iconFile: null, iconPreview: null,
  });

  // Crop state
  const [isCropping, setIsCropping] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [originalFileForCrop, setOriginalFileForCrop] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // Drag
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // ===== Fetch =====
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch(`${API_URL}/agencies`);
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ===== Filtered items for active tab =====
  const tabItems = items
    .filter((i) => i.category === activeTab)
    .filter((i) => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        i.name.toLowerCase().includes(s) ||
        (i.title && i.title.toLowerCase().includes(s))
      );
    })
    .sort((a, b) => sortDir === "asc" ? a.order - b.order : b.order - a.order);

  // ===== Drag & Drop =====
  const onDragStart = (idx: number) => { dragItem.current = idx; };
  const onDragEnter = (idx: number) => { dragOverItem.current = idx; };
  const onDragEnd = async () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (sortDir !== "asc") return;
    const list = [...tabItems];
    const [removed] = list.splice(dragItem.current, 1);
    list.splice(dragOverItem.current, 0, removed);
    const reordered = list.map((item, i) => ({ ...item, order: i + 1 }));
    setItems((prev) => {
      const others = prev.filter((i) => i.category !== activeTab);
      return [...others, ...reordered];
    });
    dragItem.current = null;
    dragOverItem.current = null;
    try {
      await authFetch(`${API_URL}/agencies/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reordered.map((m) => ({ id: m.id, order: m.order }))),
      });
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  // ===== Modal =====
  const openModal = (item?: AgencyItem) => {
    setRemovedImages({ thumbnail: false, logo: false, icon: false });
    if (item) {
      setEditingId(item.id);
      setFormData({
        name: item.name,
        title: item.title || "",
        description: item.description || "",
        url: item.url || "",
        order: item.order,
        thumbnailFile: null, originalThumbnailFile: null,
        thumbnailPreview: item.thumbnailUrl || null,
        originalThumbnailPreview: item.originalThumbnailUrl || item.thumbnailUrl || null,
        logoFile: null, logoPreview: item.logoUrl || null,
        iconFile: null, iconPreview: item.iconUrl || null,
      });
    } else {
      setEditingId(null);
      const maxOrder = tabItems.length > 0 ? Math.max(...tabItems.map((m) => m.order)) : 0;
      setFormData({
        name: "", title: "", description: "", url: "", order: maxOrder + 1,
        thumbnailFile: null, originalThumbnailFile: null,
        thumbnailPreview: null, originalThumbnailPreview: null,
        logoFile: null, logoPreview: null,
        iconFile: null, iconPreview: null,
      });
    }
    setIsModalOpen(true);
  };

  // ===== Image Select & Crop (Thumbnail 3:2) =====
  const onSelectThumbnail = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setOriginalFileForCrop(file);
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const onCropComplete = useCallback((_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleCropDone = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);
    const croppedFile = new File([croppedBlob], "thumbnail_cropped.jpg", { type: "image/jpeg" });
    setFormData((prev) => ({
      ...prev,
      thumbnailFile: croppedFile,
      originalThumbnailFile: originalFileForCrop,
      thumbnailPreview: URL.createObjectURL(croppedBlob),
      originalThumbnailPreview: imageToCrop,
    }));
    setRemovedImages((prev) => ({ ...prev, thumbnail: false }));
    setIsCropping(false);
    setImageToCrop(null);
  };

  const handleReCrop = () => {
    if (formData.originalThumbnailPreview) {
      setImageToCrop(formData.originalThumbnailPreview);
      setOriginalFileForCrop(null);
      setIsCropping(true);
    }
  };

  // ===== Simple uploads (Logo, Icon) =====
  const onSelectLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, logoFile: file, logoPreview: URL.createObjectURL(file) }));
      setRemovedImages((prev) => ({ ...prev, logo: false }));
    }
    e.target.value = "";
  };
  const onSelectIcon = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData((prev) => ({ ...prev, iconFile: file, iconPreview: URL.createObjectURL(file) }));
      setRemovedImages((prev) => ({ ...prev, icon: false }));
    }
    e.target.value = "";
  };

  // ===== Submit =====
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    MySwal.fire({ title: "กำลังบันทึก...", didOpen: () => Swal.showLoading() });
    try {
      const form = new FormData();
      form.append("name", formData.name);
      form.append("title", formData.title);
      form.append("description", formData.description);
      form.append("url", formData.url);
      form.append("order", formData.order.toString());
      form.append("category", activeTab);
      if (formData.thumbnailFile) form.append("thumbnail", formData.thumbnailFile);
      if (formData.originalThumbnailFile) form.append("originalThumbnail", formData.originalThumbnailFile);
      if (formData.logoFile) form.append("logo", formData.logoFile);
      if (formData.iconFile) form.append("icon", formData.iconFile);
      // Send remove flags
      if (removedImages.thumbnail) form.append("removeThumbnail", "true");
      if (removedImages.logo) form.append("removeLogo", "true");
      if (removedImages.icon) form.append("removeIcon", "true");

      const apiUrl = editingId ? `${API_URL}/agencies/${editingId}` : `${API_URL}/agencies`;
      const method = editingId ? "PUT" : "POST";

      const res = await authFetch(apiUrl, { method, body: form });
      if (!res.ok) throw new Error("Save failed");

      await MySwal.fire({ icon: "success", title: "สำเร็จ", timer: 1200, showConfirmButton: false });
      setIsModalOpen(false);
      fetchData();
    } catch {
      MySwal.fire("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกข้อมูลได้", "error");
    }
  };

  // ===== Delete =====
  const handleDelete = async (id: number) => {
    const result = await MySwal.fire({
      title: "ยืนยันการลบ?",
      text: "ข้อมูลจะถูกลบถาวร",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#ef4444",
    });
    if (result.isConfirmed) {
      await authFetch(`${API_URL}/agencies/${id}`, { method: "DELETE" });
      fetchData();
      MySwal.fire({ icon: "success", title: "ลบสำเร็จ", timer: 1200, showConfirmButton: false });
    }
  };

  // ===== Render =====
  return (
    <div className={styles.wrapper}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>หน่วยงาน</h1>
          <p className={styles.pageSubtitle}>จัดการข้อมูลหน่วยงาน</p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className={styles.tabContainer}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            className={`${styles.tabButton} ${activeTab === cat.key ? styles.tabButtonActive : ""}`}
            onClick={() => { setActiveTab(cat.key); setSearchTerm(""); }}
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
            placeholder="ค้นหาหน่วยงาน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>
        <button className={styles.addBtn} onClick={() => openModal()}>
          <Plus size={18} /> เพิ่มข้อมูลใหม่
        </button>
      </div>

      {/* Table */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th
                className={styles.sortableHeader}
                onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                style={{ width: "80px" }}
              >
                <span>ลำดับ <ArrowUpDown size={14} /></span>
              </th>
              <th style={{ width: "90px", textAlign: "center" }}>Thumbnail</th>
              <th>ชื่อหน่วยงาน</th>
              <th>ชื่อ Title</th>
              <th style={{ textAlign: "center" }}>คำอธิบาย</th>
              <th style={{ width: "80px", textAlign: "center" }}>Logo</th>
              <th style={{ width: "80px", textAlign: "center" }}>Icon</th>
              <th>URL</th>
              <th style={{ width: "100px", textAlign: "center" }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {tabItems.map((item, idx) => (
              <tr
                key={item.id}
                draggable={sortDir === "asc"}
                onDragStart={() => onDragStart(idx)}
                onDragEnter={() => onDragEnter(idx)}
                onDragEnd={onDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={styles.tableRow}
              >
                <td>
                  <div className={styles.orderCell}>
                    {sortDir === "asc" && (
                      <GripVertical size={16} className={styles.dragHandle} />
                    )}
                    <span>{item.order}</span>
                  </div>
                </td>
                <td style={{ textAlign: "center" }}>
                  {item.thumbnailUrl ? (
                    <div className={styles.imageCell}>
                      <img
                        src={item.thumbnailUrl}
                        alt=""
                        className={styles.thumbnailImg}
                        onClick={() => setPreviewImage(item.thumbnailUrl)}
                        style={{ cursor: "pointer" }}
                      />
                      <span className={styles.viewImageLabel} onClick={() => setPreviewImage(item.thumbnailUrl)}>
                        <ZoomIn size={12} /> ดูภาพเต็ม
                      </span>
                    </div>
                  ) : (
                    <span className={styles.noImage}>—</span>
                  )}
                </td>
                <td className={styles.nameCell}>{item.name}</td>
                <td className={styles.titleCell}>{item.title || "—"}</td>
                <td style={{ textAlign: "center" }}>
                  {item.description ? (
                    <button
                      className={styles.btnReadDetail}
                      onClick={() => {
                        MySwal.fire({
                          title: item.name,
                          html: `<div style="color:#374151;font-size:0.95rem;line-height:1.7;white-space:pre-wrap;background:#f9fafb;padding:1.5rem;border-radius:0.5rem;border:1px solid #e5e7eb;max-height:60vh;overflow-y:auto;text-align:left;">${item.description}</div>`,
                          width: 600,
                          showCloseButton: true,
                          showConfirmButton: false,
                        });
                      }}
                    >
                      <FileText size={14} /> อ่านรายละเอียด
                    </button>
                  ) : (
                    <span className={styles.btnReadDetailDisabled}>
                      <FileText size={14} /> ไม่มีข้อมูล
                    </span>
                  )}
                </td>
                <td style={{ textAlign: "center" }}>
                  {item.logoUrl ? (
                    <div className={styles.imageCell}>
                      <img
                        src={item.logoUrl}
                        alt=""
                        className={styles.smallImg}
                        onClick={() => setPreviewImage(item.logoUrl)}
                        style={{ cursor: "pointer" }}
                      />
                      <span className={styles.viewImageLabel} onClick={() => setPreviewImage(item.logoUrl)}>
                        <ZoomIn size={12} /> ดูภาพเต็ม
                      </span>
                    </div>
                  ) : (
                    <span className={styles.noImage}>—</span>
                  )}
                </td>
                <td style={{ textAlign: "center" }}>
                  {item.iconUrl ? (
                    <div className={styles.imageCell}>
                      <img
                        src={item.iconUrl}
                        alt=""
                        className={styles.smallImg}
                        onClick={() => setPreviewImage(item.iconUrl)}
                        style={{ cursor: "pointer" }}
                      />
                      <span className={styles.viewImageLabel} onClick={() => setPreviewImage(item.iconUrl)}>
                        <ZoomIn size={12} /> ดูภาพเต็ม
                      </span>
                    </div>
                  ) : (
                    <span className={styles.noImage}>—</span>
                  )}
                </td>
                <td>
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.urlLink}
                    >
                      <ExternalLink size={14} /> เปิดลิงก์
                    </a>
                  ) : "—"}
                </td>
                <td>
                  <div className={styles.actionBtns}>
                    <button className={styles.editBtn} onClick={() => openModal(item)}>
                      <Edit size={16} />
                    </button>
                    <button className={styles.deleteBtn} onClick={() => handleDelete(item.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tabItems.length === 0 && !isLoading && (
          <div className={styles.emptyState}>ยังไม่มีข้อมูลในหมวดนี้</div>
        )}
      </div>

      {/* ===== Preview Image Modal ===== */}
      {previewImage && (
        <div className={styles.previewOverlay} onClick={() => setPreviewImage(null)}>
          <div className={styles.previewBox} onClick={(e) => e.stopPropagation()}>
            <button className={styles.previewClose} onClick={() => setPreviewImage(null)}>
              <X size={24} />
            </button>
            <img src={previewImage} alt="Preview" />
          </div>
        </div>
      )}

      {/* ===== Crop Modal ===== */}
      {isCropping && imageToCrop && (
        <div className={styles.cropModalOverlay}>
          <div className={styles.cropModalContent}>
            <div className={styles.cropperContainer}>
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={3 / 2}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className={styles.cropControls}>
              <ZoomOut size={18} className={styles.zoomIcon} />
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className={styles.zoomSlider}
              />
              <ZoomIn size={18} className={styles.zoomIcon} />
            </div>
            <div className={styles.cropActions}>
              <button type="button" className={styles.btnCancel} onClick={() => { setIsCropping(false); setImageToCrop(null); }}>
                ยกเลิก
              </button>
              <button type="button" className={styles.btnSubmit} onClick={handleCropDone}>
                ครอปและบันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CRUD Modal ===== */}
      {isModalOpen && (
        <CrudModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          title={editingId ? "แก้ไขข้อมูลหน่วยงาน" : "เพิ่มข้อมูลหน่วยงาน"}
        >
            {/* Thumbnail (3:2 crop) */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Thumbnail (3:2) — สัดส่วนตามการ์ดบนหน้าเว็บ</label>
              {formData.thumbnailPreview ? (
                <div style={{ textAlign: "center" }}>
                  <label className={styles.modalUploadArea}>
                    <img src={formData.thumbnailPreview} alt="Thumbnail" className={styles.modalPreviewImage} />
                    <input type="file" accept="image/*" onChange={onSelectThumbnail} hidden />
                  </label>
                  <div className={styles.imageActionRow}>
                    <label className={styles.changeImageBtn}>
                      <Upload size={14} /> เปลี่ยนรูป
                      <input type="file" accept="image/*" onChange={onSelectThumbnail} hidden />
                    </label>
                    {formData.originalThumbnailPreview && (
                      <button type="button" className={styles.changeImageBtn} onClick={handleReCrop}>
                        ✂️ ครอปใหม่
                      </button>
                    )}
                    <button
                      type="button"
                      className={styles.changeImageBtn}
                      style={{ color: '#ef4444' }}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, thumbnailPreview: null, originalThumbnailPreview: null, thumbnailFile: null, originalThumbnailFile: null }));
                        setRemovedImages(prev => ({ ...prev, thumbnail: true }));
                      }}
                    >
                      <Trash2 size={14} /> ลบ Thumbnail
                    </button>
                  </div>
                </div>
              ) : (
                <label className={styles.modalUploadArea}>
                  <div className={styles.modalUploadPlaceholder}>
                    <ImageIcon size={32} />
                    <span>คลิกเพื่ออัปโหลด Thumbnail</span>
                  </div>
                  <input type="file" accept="image/*" onChange={onSelectThumbnail} hidden />
                </label>
              )}
            </div>

            {/* Logo (no crop) */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Logo</label>
              {formData.logoPreview ? (
                <div style={{ textAlign: "center" }}>
                  <label className={styles.modalUploadArea}>
                    <img src={formData.logoPreview} alt="Logo" className={styles.modalPreviewImage} />
                    <input type="file" accept="image/*" onChange={onSelectLogo} hidden />
                  </label>
                  <div className={styles.imageActionRow}>
                    <label className={styles.changeImageBtn}>
                      <Upload size={14} /> เปลี่ยน Logo
                      <input type="file" accept="image/*" onChange={onSelectLogo} hidden />
                    </label>
                    <button
                      type="button"
                      className={styles.changeImageBtn}
                      style={{ color: '#ef4444' }}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, logoPreview: null, logoFile: null }));
                        setRemovedImages(prev => ({ ...prev, logo: true }));
                      }}
                    >
                      <Trash2 size={14} /> ลบ Logo
                    </button>
                  </div>
                </div>
              ) : (
                <label className={styles.modalUploadArea}>
                  <div className={styles.modalUploadPlaceholder}>
                    <ImageIcon size={32} />
                    <span>คลิกเพื่ออัปโหลด Logo</span>
                  </div>
                  <input type="file" accept="image/*" onChange={onSelectLogo} hidden />
                </label>
              )}
            </div>

            {/* Icon (no crop) */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Icon</label>
              {formData.iconPreview ? (
                <div style={{ textAlign: "center" }}>
                  <label className={styles.modalUploadArea}>
                    <img src={formData.iconPreview} alt="Icon" className={styles.modalPreviewImage} />
                    <input type="file" accept="image/*" onChange={onSelectIcon} hidden />
                  </label>
                  <div className={styles.imageActionRow}>
                    <label className={styles.changeImageBtn}>
                      <Upload size={14} /> เปลี่ยน Icon
                      <input type="file" accept="image/*" onChange={onSelectIcon} hidden />
                    </label>
                    <button
                      type="button"
                      className={styles.changeImageBtn}
                      style={{ color: '#ef4444' }}
                      onClick={() => {
                        setFormData(prev => ({ ...prev, iconPreview: null, iconFile: null }));
                        setRemovedImages(prev => ({ ...prev, icon: true }));
                      }}
                    >
                      <Trash2 size={14} /> ลบ Icon
                    </button>
                  </div>
                </div>
              ) : (
                <label className={styles.modalUploadArea}>
                  <div className={styles.modalUploadPlaceholder}>
                    <ImageIcon size={32} />
                    <span>คลิกเพื่ออัปโหลด Icon</span>
                  </div>
                  <input type="file" accept="image/*" onChange={onSelectIcon} hidden />
                </label>
              )}
            </div>

            {/* Text fields */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>ชื่อหน่วยงาน *</label>
              <input
                required
                className={styles.formInput}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>ชื่อ Title</label>
              <input
                className={styles.formInput}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>คำอธิบายหน่วยงาน</label>
              <textarea
                className={styles.formTextarea}
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className={styles.formRow}>
              <div className={styles.formGroup} style={{ flex: 2 }}>
                <label className={styles.formLabel}>URL</label>
                <input
                  type="text"
                  placeholder="https://... (ไม่บังคับ)"
                  className={styles.formInput}
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                />
              </div>
              <div className={styles.formGroup} style={{ flex: 0.5 }}>
                <label className={styles.formLabel}>ลำดับ</label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                />
              </div>
            </div>
        </CrudModal>
      )}
    </div>
  );
}

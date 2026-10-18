// src/app/backoffice/module/council-web/about/honor/[awardId]/page.tsx
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Edit,
  Trash2,
  Plus,
  User,
  Upload,
  UploadCloud,
  X,
  ZoomIn,
  ZoomOut,
  Search,
  FileText,
  Crop,
  GripVertical,
  Play,
  ArrowLeft,
} from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import styles from "../honor.module.css";
import { authFetch } from "@/app/utils/authFetch";
import ImagePreviewModal from "@/app/components/ui/ImagePreviewModal";
import CrudModal from "@/app/components/ui/CrudModal";
import Cropper from "react-easy-crop";
import getCroppedImg from "../../../../../../components/editor/cropImage";
import Editor from "@/app/components/editor/editor";

function getYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) {
        return u.pathname.split("/")[2]?.split("?")[0] || null;
      }
      if (u.pathname.startsWith("/shorts/")) {
        return u.pathname.split("/")[2]?.split("?")[0] || null;
      }
      return u.searchParams.get("v");
    }
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1).split("?")[0] || null;
    }
  } catch {
    // not a valid URL
  }
  return null;
}

const MySwal = withReactContent(Swal);
const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface HonorItem {
  id: number;
  awardId: number;
  order: number;
  prefix?: string | null;
  name: string;
  awardName?: string | null;
  workName?: string | null;
  awardDetail?: string | null;
  fullDetail?: string | null;
  imageUrl: string | null;
  originalImageUrl?: string | null;
  videoUrl?: string | null;
}

export default function HonorRecipientsPage() {
  const params = useParams();
  const awardId = params.awardId as string;

  const [awardName, setAwardName] = useState<string>("");
  const [items, setItems] = useState<HonorItem[]>([]);
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
  const [previewVideo, setPreviewVideo] = useState<string | null>(null);
  const [viewingDetail, setViewingDetail] = useState<{
    name: string;
    text: string;
  } | null>(null);

  // Form
  const [formData, setFormData] = useState<{
    prefix: string;
    name: string;
    workName: string;
    awardDetail: string;
    fullDetail: string;
    order: number | string;
    file: File | null;
    originalFile: File | null;
    preview: string | null;
    originalPreview: string | null;
    videoUrl: string;
  }>({
    prefix: "",
    name: "",
    workName: "",
    awardDetail: "",
    fullDetail: "",
    order: 1,
    file: null,
    originalFile: null,
    preview: null,
    originalPreview: null,
    videoUrl: "",
  });

  // Crop
  const [isCropping, setIsCropping] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropComplete = (_: any, pixels: any) => setCroppedAreaPixels(pixels);

  const handleConfirmCrop = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    try {
      const ext = formData.originalFile && formData.originalFile.name.includes('.') ? formData.originalFile.name.split('.').pop() : 'jpg';
      const croppedFile = await getCroppedImg(
        imageToCrop,
        croppedAreaPixels,
        `honor-${Date.now()}.${ext}`
      );
      if (!croppedFile) throw new Error("Crop failed");
      const croppedUrl = URL.createObjectURL(croppedFile);
      setFormData((prev) => ({
        ...prev,
        preview: croppedUrl,
        file: croppedFile,
      }));
      setIsCropping(false);
      setImageToCrop(null);
    } catch (e) {
      console.error(e);
      Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถตัดรูปภาพได้", "error");
    }
  };

  const onSelectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      setFormData((prev) => ({
        ...prev,
        originalPreview: imageUrl,
        originalFile: file,
      }));
      setImageToCrop(imageUrl);
      setIsCropping(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      e.target.value = "";
    }
  };

  // Drag and drop handlers
  const handleDragStart = (
    e: React.DragEvent<HTMLTableRowElement>,
    index: number
  ) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = "move";
    setTimeout(() => {
      if (e.target instanceof HTMLElement) e.target.style.opacity = "0.5";
    }, 0);
  };

  const handleDragEnter = (
    e: React.DragEvent<HTMLTableRowElement>,
    index: number
  ) => {
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
      const res = await authFetch(`${API_URL}/honor/reorder`, {
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

  // Fetch award name
  const fetchAwardName = async () => {
    try {
      const res = await authFetch(`${API_URL}/honor-awards`);
      const data = await res.json();
      if (Array.isArray(data)) {
        const award = data.find((a: any) => a.id === parseInt(awardId));
        if (award) setAwardName(award.name);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await authFetch(`${API_URL}/honor?awardId=${awardId}`);
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
    fetchAwardName();
    fetchItems();
  }, [awardId]);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const searchLower = searchTerm.toLowerCase();
        return (
          item.name.toLowerCase().includes(searchLower) ||
          (item.workName || "").toLowerCase().includes(searchLower)
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

  const openModal = (item?: HonorItem) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        prefix: item.prefix || "",
        name: item.name,
        workName: item.workName || "",
        awardDetail: item.awardDetail || "",
        fullDetail: item.fullDetail || "",
        order: item.order,
        file: null,
        originalFile: null,
        preview: item.imageUrl || null,
        originalPreview: item.originalImageUrl || item.imageUrl || null,
        videoUrl: item.videoUrl || "",
      });
    } else {
      setEditingId(null);
      const maxOrder =
        items.length > 0 ? Math.max(...items.map((m) => m.order)) : 0;
      setFormData({
        prefix: "",
        name: "",
        workName: "",
        awardDetail: "",
        fullDetail: "",
        order: maxOrder + 1,
        file: null,
        originalFile: null,
        preview: null,
        originalPreview: null,
        videoUrl: "",
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
      form.append("awardId", awardId);
      form.append("prefix", formData.prefix);
      form.append("name", formData.name);
      form.append("awardName", awardName); // legacy field
      form.append("workName", formData.workName);
      form.append("awardDetail", formData.awardDetail);
      form.append("fullDetail", formData.fullDetail);
      form.append("videoUrl", formData.videoUrl.trim());
      form.append("order", formData.order.toString());
      if (formData.file) form.append("image", formData.file);
      if (formData.originalFile)
        form.append("originalImage", formData.originalFile);

      const url = editingId
        ? `${API_URL}/honor/${editingId}`
        : `${API_URL}/honor`;
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
      await authFetch(`${API_URL}/honor/${id}`, { method: "DELETE" });
      fetchItems();
      MySwal.fire("ลบสำเร็จ", "", "success");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <Link
            href="/backoffice/module/council-web/about/honor"
            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm mb-2"
            style={{ textDecoration: "none" }}
          >
            <ArrowLeft size={16} /> กลับไปรายการรางวัล
          </Link>
          <h1 className={styles.title}>
            ผู้ได้รับรางวัล: {awardName || "กำลังโหลด..."}
          </h1>
          <p className={styles.subtitle}>
            จัดการรายชื่อเภสัชกรผู้ได้รับรางวัลนี้
          </p>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="ค้นหาชื่อ, ผลงาน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button onClick={() => openModal()} className={styles.btnAdd}>
          <Plus size={20} /> เพิ่มข้อมูลใหม่
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
                <th className={`${styles.tableTh} text-center w-24`}>
                  รูปภาพ
                </th>
                <th className={`${styles.tableTh} w-24`}>คำนำหน้าชื่อ</th>
                <th className={styles.tableTh}>ชื่อ-นามสกุล</th>
                <th className={styles.tableTh}>ชื่อผลงาน</th>
                <th className={`${styles.tableTh} text-center`}>
                  รายละเอียด
                </th>
                <th className={`${styles.tableTh} text-center`}>วิดีโอ</th>
                <th className={`${styles.tableTh} text-center w-32`}>
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 && !isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
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

                    <td className={styles.tableTd}>
                      <div className={styles.imageCell}>
                        <div
                          className={`${styles.avatarContainer} ${item.imageUrl ? styles.clickableAvatar : ""}`}
                          onClick={() => {
                            if (item.imageUrl) setPreviewImage(item.imageUrl);
                          }}
                        >
                          {item.imageUrl ? (
                            <>
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className={styles.avatarImg}
                              />
                              <div className={styles.zoomOverlay}>
                                <ZoomIn size={16} />
                              </div>
                            </>
                          ) : (
                            <User
                              size={20}
                              className={styles.avatarPlaceholder}
                            />
                          )}
                        </div>
                        {item.imageUrl && (
                          <span
                            className={styles.viewImageLabel}
                            onClick={() => setPreviewImage(item.imageUrl!)}
                          >
                            <ZoomIn size={12} /> ดูภาพเต็ม
                          </span>
                        )}
                      </div>
                    </td>

                    <td className={`${styles.tableTd} text-gray-600`}>
                      {item.prefix || "-"}
                    </td>

                    <td
                      className={`${styles.tableTd} font-medium text-gray-900`}
                    >
                      {item.name}
                    </td>

                    <td className={`${styles.tableTd} text-gray-600`}>
                      {item.workName || "-"}
                    </td>

                    <td className={`${styles.tableTd} text-center`}>
                      {item.awardDetail &&
                      item.awardDetail.trim() !== "" ? (
                        <button
                          type="button"
                          className={styles.btnReadDetail}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setViewingDetail({
                              name: awardName,
                              text: item.awardDetail!,
                            });
                          }}
                        >
                          <FileText size={14} /> อ่านรายละเอียด
                        </button>
                      ) : (
                        <span className={styles.btnReadDetailDisabled}>-</span>
                      )}
                    </td>

                    <td className={`${styles.tableTd} text-center`}>
                      {item.videoUrl ? (
                        <button
                          type="button"
                          className={styles.videoBadge}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setPreviewVideo(item.videoUrl!);
                          }}
                        >
                          <Play size={14} /> ดูวิดีโอ
                        </button>
                      ) : (
                        <span className={styles.videoBadgeDisabled}>-</span>
                      )}
                    </td>

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

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          imageUrl={previewImage}
          onClose={() => setPreviewImage(null)}
        />
      )}

      {/* Video Preview Modal */}
      {previewVideo && (
        <div
          className={styles.videoPreviewOverlay}
          onClick={() => setPreviewVideo(null)}
        >
          <div
            className={styles.videoPreviewContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className={styles.closeVideoBtn}
              onClick={() => setPreviewVideo(null)}
            >
              <X size={24} />
            </button>
            {getYouTubeId(previewVideo) ? (
              <iframe
                src={`https://www.youtube.com/embed/${getYouTubeId(previewVideo)}?autoplay=1`}
                title="วิดีโอเกียรติประวัติ"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className={styles.youtubePreviewFrame}
              />
            ) : (
              <video src={previewVideo} controls autoPlay />
            )}
          </div>
        </div>
      )}

      {/* Award Detail Modal */}
      {viewingDetail && (
        <CrudModal
          isOpen={true}
          onClose={() => setViewingDetail(null)}
          onSubmit={(e) => { e.preventDefault(); setViewingDetail(null); }}
          title={`📋 รายละเอียดรางวัล: ${viewingDetail.name}`}
        >
          <div className={styles.detailContent}>{viewingDetail.text}</div>
        </CrudModal>
      )}

      {/* Crop Modal */}
      {isCropping && imageToCrop && (
        <div className={styles.cropModalOverlay}>
          <div className={styles.cropModalContent}>
            <div className={styles.cropperContainer}>
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={4 / 3}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className={styles.cropControls}>
              <div className={styles.zoomSliderContainer}>
                <ZoomOut size={18} />
                <input
                  type="range"
                  className={styles.zoomSlider}
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                />
                <ZoomIn size={18} />
              </div>
              <div className={styles.cropActions}>
                <button
                  className={styles.btnCropCancel}
                  onClick={() => {
                    setIsCropping(false);
                    setImageToCrop(null);
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  className={styles.btnCropConfirm}
                  onClick={handleConfirmCrop}
                >
                  ✂️ ยืนยันการตัดรูป
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CRUD Modal */}
      {isModalOpen && (
        <CrudModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSubmit}
          title={editingId ? "แก้ไขข้อมูลผู้ได้รับรางวัล" : "เพิ่มผู้ได้รับรางวัล"}
          maxWidth="48rem"
        >
            {/* รูปเภสัช (4:3 crop) */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>รูปภาพเภสัชกร (4:3)</label>
              {formData.preview ? (
                <div style={{ textAlign: "center" }}>
                  <label className={styles.modalUploadArea}>
                    <img
                      src={formData.preview}
                      alt="Preview"
                      className={styles.modalPreviewImage}
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onSelectImage}
                      hidden
                    />
                  </label>
                  <div className={styles.imageActionRow}>
                    <label className={styles.changeImageBtn}>
                      <Upload size={14} /> เปลี่ยนรูป
                      <input
                        type="file"
                        accept="image/*"
                        onChange={onSelectImage}
                        hidden
                      />
                    </label>
                    {formData.originalPreview && (
                      <button
                        type="button"
                        className={styles.changeImageBtn}
                        onClick={() => {
                          setImageToCrop(formData.originalPreview);
                          setIsCropping(true);
                          setCrop({ x: 0, y: 0 });
                          setZoom(1);
                        }}
                      >
                        <Crop size={14} /> ครอปใหม่
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <label className={styles.modalUploadArea}>
                  <div className={styles.modalUploadPlaceholder}>
                    <UploadCloud size={32} />
                    <span>คลิกเพื่ออัปโหลดรูป</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onSelectImage}
                    hidden
                  />
                </label>
              )}
            </div>

            {/* คำนำหน้าชื่อ + ลำดับ */}
            <div className={styles.gridTwo}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>คำนำหน้าชื่อ</label>
                <input
                  className={styles.formInput}
                  placeholder="เช่น ภท., ดร., รศ."
                  value={formData.prefix}
                  onChange={(e) =>
                    setFormData({ ...formData, prefix: e.target.value })
                  }
                />
              </div>
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
            </div>

            {/* ชื่อ */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>ชื่อ-นามสกุล *</label>
              <input
                className={styles.formInput}
                placeholder="กรอกชื่อ-นามสกุล"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            {/* ชื่อผลงาน */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>ชื่อผลงาน</label>
              <input
                className={styles.formInput}
                placeholder="กรอกชื่อผลงาน"
                value={formData.workName}
                onChange={(e) =>
                  setFormData({ ...formData, workName: e.target.value })
                }
              />
            </div>

            {/* รายละเอียด */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>รายละเอียดรางวัล</label>
              <textarea
                className={styles.formTextarea}
                placeholder="กรอกรายละเอียดเพิ่มเติม..."
                value={formData.awardDetail}
                onChange={(e) =>
                  setFormData({ ...formData, awardDetail: e.target.value })
                }
                rows={4}
              />
            </div>

            {/* ข้อมูลผู้ได้รับรางวัลฉบับเต็ม */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>ข้อมูลผู้ได้รับรางวัลฉบับเต็ม</label>
              <Editor
                value={formData.fullDetail}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, fullDetail: value }))
                }
                placeholder="กรอกข้อมูลผู้ได้รับรางวัลฉบับเต็ม..."
                variant="simple"
              />
            </div>

            {/* วิดีโอ YouTube */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>วิดีโอ</label>
              <input
                type="text"
                className={styles.formInput}
                placeholder="แปะ Link จาก YouTube"
                value={formData.videoUrl}
                onChange={(e) =>
                  setFormData({ ...formData, videoUrl: e.target.value })
                }
              />
            </div>
        </CrudModal>
      )}
    </div>
  );
}

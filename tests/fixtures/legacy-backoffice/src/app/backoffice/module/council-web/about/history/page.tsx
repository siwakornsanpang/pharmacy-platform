"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Edit,
  Trash2,
  Plus,
  User,
  ImageIcon,
  UploadCloud,
  X,
  ZoomIn,
  ZoomOut,
  Search,
  Crop,
  Upload,
} from "lucide-react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../../../../components/editor/cropImage';
import styles from "../council/council.module.css";
import { authFetch } from '@/app/utils/authFetch';
import ImagePreviewModal from '@/app/components/ui/ImagePreviewModal';
import CrudModal from '@/app/components/ui/CrudModal';
import ImageUploader from '@/app/components/ui/ImageUploader';

const MySwal = withReactContent(Swal);
const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface HistoryItem {
  id: number;
  term: string;
  startYear: string;
  endYear: string;
  presidentName: string;
  secretaryName: string;
  presidentImage: string | null;
  originalPresidentImage: string | null;
  secretaryImage: string | null;
  originalSecretaryImage: string | null;
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // --- 🔥 1. เพิ่ม State สำหรับค้นหา ---
  const [searchTerm, setSearchTerm] = useState("");

  // Sorting
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleSort = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const getSortIcon = () => {
    return sortDirection === "asc" ? "↑" : "↓";
  };

  // --- 🔥 2. Logic กรองและเรียงข้อมูล (Filter & Sort) ---
  const filteredItems = useMemo(() => {
    let result = [...items];

    // 2.1 กรองข้อมูลตามคำค้นหา
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.presidentName.toLowerCase().includes(lowerTerm) ||
          item.secretaryName.toLowerCase().includes(lowerTerm) ||
          item.startYear.includes(lowerTerm) ||
          item.endYear.includes(lowerTerm) ||
          item.term.includes(lowerTerm),
      );
    }

    // 2.2 เรียงลำดับ (ใช้ Logic วาระที่เป็นตัวเลข)
    result.sort((a, b) => {
      const aVal = parseInt(a.term) || 0;
      const bVal = parseInt(b.term) || 0;
      if (sortDirection === "asc") return aVal - bVal;
      return bVal - aVal;
    });

    return result;
  }, [items, searchTerm, sortDirection]);

  // Form Data (มี 2 รูป)
  const [formData, setFormData] = useState<{
    term: string;
    startYear: string;
    endYear: string;
    presidentName: string;
    secretaryName: string;
    presidentFile: File | null;
    originalPresidentFile: File | null;
    secretaryFile: File | null;
    originalSecretaryFile: File | null;
    presidentPreview: string | null;
    secretaryPreview: string | null;
    originalPresidentPreview: string | null;
    originalSecretaryPreview: string | null;
  }>({
    term: "",
    startYear: "",
    endYear: "",
    presidentName: "",
    secretaryName: "",
    presidentFile: null,
    originalPresidentFile: null,
    secretaryFile: null,
    originalSecretaryFile: null,
    presidentPreview: null,
    secretaryPreview: null,
    originalPresidentPreview: null,
    originalSecretaryPreview: null,
  });

  // --- 🔥 Cropper State สำหรับ 2 รูป (President / Secretary) ---
  const [isCropping, setIsCropping] = useState(false);
  const [cropType, setCropType] = useState<'president' | 'secretary' | null>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const onCropComplete = (_: any, pixels: any) => setCroppedAreaPixels(pixels);

  const handleConfirmCrop = async () => {
    if (!imageToCrop || !croppedAreaPixels || !cropType) return;
    try {
      const originalFile = cropType === 'president' ? formData.originalPresidentFile : formData.originalSecretaryFile;
      const ext = originalFile && originalFile.name.includes('.') ? originalFile.name.split('.').pop() : 'jpg';
      const croppedFile = await getCroppedImg(imageToCrop, croppedAreaPixels, `history-${cropType}-${Date.now()}.${ext}`);
      if (!croppedFile) throw new Error("Crop failed");
      const croppedUrl = URL.createObjectURL(croppedFile);
      
      setFormData(prev => ({ 
        ...prev, 
        ...(cropType === 'president' ? { presidentPreview: croppedUrl, presidentFile: croppedFile } : { secretaryPreview: croppedUrl, secretaryFile: croppedFile }) 
      }));
      
      setIsCropping(false);
      setImageToCrop(null);
      setCropType(null);
    } catch (e) {
      console.error(e);
      Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถตัดรูปภาพได้", "error");
    }
  };

  const onSelectImage = (e: React.ChangeEvent<HTMLInputElement>, type: 'president' | 'secretary') => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      
      setFormData(prev => ({ 
        ...prev, 
        ...(type === 'president' ? { originalPresidentPreview: imageUrl, originalPresidentFile: file } : { originalSecretaryPreview: imageUrl, originalSecretaryFile: file })
      }));
      
      setCropType(type);
      setImageToCrop(imageUrl);
      setIsCropping(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      e.target.value = '';
    }
  };

  const fetchItems = async () => {
    try {
      const res = await authFetch(`${API_URL}/history`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setItems(data);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error(err);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openModal = (item?: HistoryItem) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        term: item.term,
        startYear: item.startYear,
        endYear: item.endYear,
        presidentName: item.presidentName,
        secretaryName: item.secretaryName,
        presidentFile: null,
        originalPresidentFile: null,
        secretaryFile: null,
        originalSecretaryFile: null,
        presidentPreview: item.presidentImage,
        secretaryPreview: item.secretaryImage,
        originalPresidentPreview: item.originalPresidentImage || item.presidentImage,
        originalSecretaryPreview: item.originalSecretaryImage || item.secretaryImage,
      });
    } else {
      setEditingId(null);
      setFormData({
        term: "",
        startYear: "",
        endYear: "",
        presidentName: "",
        secretaryName: "",
        presidentFile: null,
        originalPresidentFile: null,
        secretaryFile: null,
        originalSecretaryFile: null,
        presidentPreview: null,
        secretaryPreview: null,
        originalPresidentPreview: null,
        originalSecretaryPreview: null,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    MySwal.fire({ title: "กำลังบันทึก...", didOpen: () => Swal.showLoading() });
    try {
      const form = new FormData();
      form.append("term", formData.term);
      form.append("startYear", formData.startYear);
      form.append("endYear", formData.endYear);
      form.append("presidentName", formData.presidentName);
      form.append("secretaryName", formData.secretaryName);

      // ส่งรูปเฉพาะที่มีการเปลี่ยน/เพิ่ม
      if (formData.presidentFile) form.append("presidentImage", formData.presidentFile);
      if (formData.originalPresidentFile) form.append("originalPresidentImage", formData.originalPresidentFile);
      
      if (formData.secretaryFile) form.append("secretaryImage", formData.secretaryFile);
      if (formData.originalSecretaryFile) form.append("originalSecretaryImage", formData.originalSecretaryFile);

      const url = editingId
        ? `${API_URL}/history/${editingId}`
        : `${API_URL}/history`;
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
      await authFetch(`${API_URL}/history/${id}`, { method: "DELETE" });
      fetchItems();
      MySwal.fire("ลบสำเร็จ", "", "success");
    }
  };


  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>ทำเนียบสภาเภสัชกรรม</h1>
          <p className={styles.subtitle}>
            จัดการข้อมูลวาระ, ปีที่ดำรงตำแหน่ง, นายก และเลขาธิการ
          </p>
        </div>
      </div>

      <div className={styles.toolbar}>
        {/* ช่องค้นหา */}
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="ค้นหาวาระ, ชื่อ, หรือปี..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* ปุ่มเพิ่มข้อมูล (ย้ายมาไว้ตรงนี้) */}
        <button onClick={() => openModal()} className={styles.btnAdd}>
          <Plus size={20} /> เพิ่มวาระใหม่
        </button>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.tableHead}>
                <th
                  className={`${styles.tableTh} ${styles.thSortable} text-center w-20`}
                  onClick={handleSort}
                >
                  วาระ{" "}
                  <span className={styles.sortIconActive}>{getSortIcon()}</span>
                </th>
                <th className={`${styles.tableTh} w-32`}>ปี (พ.ศ.) เริ่มวาระ</th>
                <th className={`${styles.tableTh} w-32`}>ปี (พ.ศ.) สิ้นสุดวาระ</th>
                <th className={`${styles.tableTh} text-center w-32`}>
                  รูปนายก
                </th>
                <th className={styles.tableTh}>ชื่อนายกสภา</th>
                <th className={`${styles.tableTh} text-center w-32`}>
                  รูปเลขา
                </th>
                <th className={styles.tableTh}>ชื่อเลขาธิการ</th>
                <th className={`${styles.tableTh} text-center w-24`}>จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.map((item) => (
                <tr key={item.id} className={styles.tableRow}>
                   <td className={`${styles.tableTd} text-center`}>
                      <span className={styles.orderBadge}> {item.term}</span>
                    </td>


                  
                  <td className="p-4 text-gray-600 text-center">{item.startYear}</td>
                  <td className="p-4 text-gray-600 text-center">{item.endYear}</td>

                  {/* รูปนายก */}
                  <td className={styles.tableTd}>
                    <div className={styles.imageCell}>
                      <div
                        className={`${styles.avatarContainer} ${item.presidentImage ? styles.clickableAvatar : ""}`}
                        onClick={() =>
                          item.presidentImage &&
                          setPreviewImage(item.presidentImage)
                        }
                        title={
                          item.presidentImage ? "คลิกเพื่อดูรูปขนาดเต็ม" : ""
                        }
                      >
                        {item.presidentImage ? (
                          <>
                            <img
                              src={item.presidentImage}
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
                      {item.presidentImage && (
                        <span
                          className={styles.viewImageLabel}
                          onClick={() => setPreviewImage(item.presidentImage!)}
                        >
                          <ZoomIn size={12} /> ดูภาพเต็ม
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-medium">{item.presidentName}</td>

                  {/* รูปเลขา */}
                  <td className={styles.tableTd}>
                    <div className={styles.imageCell}>
                      <div
                        className={`${styles.avatarContainer} ${item.secretaryImage ? styles.clickableAvatar : ""}`}
                        onClick={() =>
                          item.secretaryImage &&
                          setPreviewImage(item.secretaryImage)
                        }
                        title={
                          item.secretaryImage ? "คลิกเพื่อดูรูปขนาดเต็ม" : ""
                        }
                      >
                        {item.secretaryImage ? (
                          <>
                            <img
                              src={item.secretaryImage}
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
                      {item.secretaryImage && (
                        <span
                          className={styles.viewImageLabel}
                          onClick={() => setPreviewImage(item.secretaryImage!)}
                        >
                          <ZoomIn size={12} /> ดูภาพเต็ม
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 font-medium">{item.secretaryName}</td>

                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => openModal(item)}
                        className={styles.btnIconEdit}
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className={styles.btnIconDelete}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CRUD Modal */}
      <CrudModal
        isOpen={isModalOpen}
        title={editingId ? "แก้ไขข้อมูล" : "เพิ่มข้อมูลทำเนียบ"}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSubmit}
        maxWidth="40rem"
      >
        {/* วาระ + ปี */}
        <div className={styles.gridTwo}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>วาระที่ <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input type="text" required className={styles.formInput} placeholder="เช่น 13" value={formData.term} onChange={(e) => setFormData({ ...formData, term: e.target.value })} />
          </div>
          <div className={styles.gridTwo} style={{ gap: '1rem' }}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>ปีเริ่มวาระ (พ.ศ.) <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input type="text" required className={styles.formInput} placeholder="เช่น 2568" value={formData.startYear} onChange={(e) => setFormData({ ...formData, startYear: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>ปีสิ้นสุดวาระ (พ.ศ.) <span style={{ color: 'var(--color-danger)' }}>*</span></label>
              <input type="text" required className={styles.formInput} placeholder="เช่น 2570" value={formData.endYear} onChange={(e) => setFormData({ ...formData, endYear: e.target.value })} />
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--color-border-light)', margin: '1rem 0' }} />

        {/* รูปภาพคู่ (President & Secretary) โดยใช้ Custom Uploader */}
        <div className={styles.gridTwo} style={{ gap: '2rem' }}>
          
          {/* อัปโหลดรูปนายก */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>รูปนายกสภา</label>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <label htmlFor="president-upload" className={styles.modalUploadArea} style={{ width: '100%', margin: 0 }}>
                {formData.presidentPreview ? (
                  <img src={formData.presidentPreview} alt="President Preview" className={styles.modalPreviewImage} />
                ) : (
                  <div className={styles.modalUploadPlaceholder}>
                    <Upload size={32} />
                    <span style={{ fontWeight: 500 }}>คลิกเพื่ออัปโหลดรูปภาพ</span>
                    <span style={{ fontSize: '0.8rem' }}>แนะนำขนาด 4:3</span>
                  </div>
                )}
                <input id="president-upload" type="file" accept="image/*" className="hidden" onChange={(e) => onSelectImage(e, 'president')} />
              </label>

              {formData.presidentPreview && (
                <div className={styles.imageActionRow} style={{ marginTop: '0.5rem' }}>
                   <button type="button" className={styles.changeImageBtn} onClick={() => {
                      setImageToCrop(formData.originalPresidentPreview || formData.presidentPreview);
                      setCropType('president');
                      setIsCropping(true);
                      setCrop({ x: 0, y: 0 });
                      setZoom(1);
                   }}>
                     <Crop size={14} /> ครอปใหม่
                   </button>
                   <button type="button" className={styles.changeImageBtn} onClick={() => document.getElementById('president-upload')?.click()}>
                     <Upload size={14} /> เปลี่ยนรูป
                   </button>
                </div>
              )}
            </div>
          </div>

          {/* อัปโหลดรูปเลขา */}
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>รูปเลขาธิการ</label>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <label htmlFor="secretary-upload" className={styles.modalUploadArea} style={{ width: '100%', margin: 0 }}>
                {formData.secretaryPreview ? (
                  <img src={formData.secretaryPreview} alt="Secretary Preview" className={styles.modalPreviewImage} />
                ) : (
                  <div className={styles.modalUploadPlaceholder}>
                    <Upload size={32} />
                    <span style={{ fontWeight: 500 }}>คลิกเพื่ออัปโหลดรูปภาพ</span>
                    <span style={{ fontSize: '0.8rem' }}>แนะนำขนาด 4:3</span>
                  </div>
                )}
                <input id="secretary-upload" type="file" accept="image/*" className="hidden" onChange={(e) => onSelectImage(e, 'secretary')} />
              </label>

              {formData.secretaryPreview && (
                <div className={styles.imageActionRow} style={{ marginTop: '0.5rem' }}>
                   <button type="button" className={styles.changeImageBtn} onClick={() => {
                      setImageToCrop(formData.originalSecretaryPreview || formData.secretaryPreview);
                      setCropType('secretary');
                      setIsCropping(true);
                      setCrop({ x: 0, y: 0 });
                      setZoom(1);
                   }}>
                     <Crop size={14} /> ครอปใหม่
                   </button>
                   <button type="button" className={styles.changeImageBtn} onClick={() => document.getElementById('secretary-upload')?.click()}>
                     <Upload size={14} /> เปลี่ยนรูป
                   </button>
                </div>
              )}
            </div>
          </div>

        </div>

        <div style={{ borderTop: '1px solid var(--color-border-light)', margin: '1rem 0' }} />

        {/* ชื่อนายก */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>ชื่อนายกสภา <span style={{ color: 'var(--color-danger)' }}>*</span></label>
          <input type="text" required className={styles.formInput} placeholder="ระบุชื่อนายก..." value={formData.presidentName} onChange={(e) => setFormData({ ...formData, presidentName: e.target.value })} />
        </div>

        {/* ชื่อเลขา */}
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>ชื่อเลขาธิการ <span style={{ color: 'var(--color-danger)' }}>*</span></label>
          <input type="text" required className={styles.formInput} placeholder="ระบุชื่อเลขา..." value={formData.secretaryName} onChange={(e) => setFormData({ ...formData, secretaryName: e.target.value })} />
        </div>
      </CrudModal>

      {/* Image Preview Modal */}
      <ImagePreviewModal imageUrl={previewImage} onClose={() => setPreviewImage(null)} />

      {/* Cropper Modal */}
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
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className={styles.cropControls}>
              <div className={styles.zoomSliderContainer}>
                <ZoomOut size={20} color="#9ca3af" />
                <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className={styles.zoomSlider} />
                <ZoomIn size={20} color="#9ca3af" />
              </div>
              <div className={styles.cropActions}>
                <button onClick={() => { setIsCropping(false); setImageToCrop(null); }} className={styles.btnCropCancel}>
                  ยกเลิก
                </button>
                <button onClick={handleConfirmCrop} className={styles.btnCropConfirm}>
                  ครอปและบันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

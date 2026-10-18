"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Image as ImageIcon, Upload, Trash2, Edit, GripVertical, ZoomIn, ZoomOut, Plus, X, Link as LinkIcon, Crop } from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../../../components/editor/cropImage';
import styles from './home.module.css';
import { authFetch } from '@/app/utils/authFetch';

const MySwal = withReactContent(Swal);

// =============== Types ===============
type BannerItem = {
  id: string;
  url: string;
  originalUrl: string;
  title: string;
  clickable: boolean;
  linkUrl: string;
  active: boolean;
  file?: File;
  originalFile?: File;
};

type BannerFormData = {
  title: string;
  clickable: boolean;
  linkUrl: string;
  active: boolean;
  imageUrl: string;
  originalImageUrl: string;
  file: File | null;
  originalFile: File | null;
};

const defaultBannerForm: BannerFormData = {
  title: '', clickable: false, linkUrl: '', active: true,
  imageUrl: '', originalImageUrl: '', file: null, originalFile: null,
};

export default function PharmacistWebHomePage() {
  // =============== Banner State ===============
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const bannerDrag = useRef<number | null>(null);
  const bannerDragOver = useRef<number | null>(null);

  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [bannerEditIndex, setBannerEditIndex] = useState<number | null>(null);
  const [bannerForm, setBannerForm] = useState<BannerFormData>(defaultBannerForm);

  // =============== Crop State ===============
  const [isCropping, setIsCropping] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(false);
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // =============== Load Data ===============
  useEffect(() => {
    if (!API_URL) return;
    authFetch(`${API_URL}/pharmacist-home-content`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.banners) {
          setBanners(data.banners.map((b: any) => ({
            id: b.id, url: b.url,
            originalUrl: b.originalUrl || b.url,
            title: b.title || '', clickable: b.clickable || false,
            linkUrl: b.linkUrl || '', active: b.active
          })));
        }
      });
  }, [API_URL]);

  // =============== Auto-save API ===============
  const saveToAPI = useCallback(async (
    bannersToSave: BannerItem[]
  ) => {
    if (!API_URL) return false;
    try {
      const formPayload = new FormData();

      // Banner metadata + files
      const bannerMeta = bannersToSave.map(b => ({
        id: b.id.startsWith('temp-') ? null : b.id,
        url: b.url, originalUrl: b.originalUrl || '',
        title: b.title, clickable: b.clickable, linkUrl: b.linkUrl,
        active: b.active, isNewFile: !!b.file, isNewOriginal: !!b.originalFile
      }));
      formPayload.append("bannerData", JSON.stringify(bannerMeta));
      bannersToSave.forEach(b => { if (b.file) formPayload.append("bannerFiles", b.file); });
      bannersToSave.forEach(b => { if (b.originalFile) formPayload.append("originalBannerFiles", b.originalFile); });

      const res = await authFetch(`${API_URL}/pharmacist-home-content`, { method: 'POST', body: formPayload });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Save failed:", res.status, errorData);
        throw new Error(errorData.message || "Failed");
      }
      return true;
    } catch (error: any) {
      console.error(error);
      Swal.fire('เกิดข้อผิดพลาด', error.message === "Failed" ? 'ไม่สามารถบันทึกได้ กรุณาลองใหม่' : `ข้อผิดพลาด: ${error.message}`, 'error');
      return false;
    }
  }, [API_URL]);

  // =============================================
  // BANNER FUNCTIONS
  // =============================================

  const openBannerAdd = () => { setBannerEditIndex(null); setBannerForm(defaultBannerForm); setIsBannerModalOpen(true); };
  const openBannerEdit = (i: number) => {
    const b = banners[i];
    setBannerEditIndex(i);
    setBannerForm({
      title: b.title, clickable: b.clickable, linkUrl: b.linkUrl, active: b.active,
      imageUrl: b.url, originalImageUrl: b.originalUrl || b.url,
      file: b.file || null, originalFile: b.originalFile || null,
    });
    setIsBannerModalOpen(true);
  };
  const closeBannerModal = () => { setIsBannerModalOpen(false); setBannerEditIndex(null); setBannerForm(defaultBannerForm); };

  const onSelectBannerImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const imageUrl = URL.createObjectURL(file);
      setBannerForm(prev => ({ ...prev, originalImageUrl: imageUrl, originalFile: file }));
      setImageToCrop(imageUrl);
      setIsCropping(true);
      setCrop({ x: 0, y: 0 }); setZoom(1);
      e.target.value = '';
    }
  };

  const onCropComplete = (_: any, pixels: any) => setCroppedAreaPixels(pixels);

  const handleConfirmCrop = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    try {
      const croppedFile = await getCroppedImg(imageToCrop, croppedAreaPixels, `banner-${Date.now()}.jpg`);
      if (!croppedFile) throw new Error("Crop failed");
      const croppedUrl = URL.createObjectURL(croppedFile);
      setBannerForm(prev => ({ ...prev, imageUrl: croppedUrl, file: croppedFile }));
      setIsCropping(false); setImageToCrop(null);
    } catch (e) {
      console.error(e);
      Swal.fire("เกิดข้อผิดพลาด", "ไม่สามารถตัดรูปภาพได้", "error");
    }
  };

  const handleSaveBanner = async () => {
    if (!bannerForm.imageUrl) { Swal.fire('กรุณาเลือกรูปภาพ', '', 'warning'); return; }
    setIsLoading(true);
    MySwal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    let updated: BannerItem[];
    if (bannerEditIndex !== null) {
      updated = [...banners];
      updated[bannerEditIndex] = {
        ...updated[bannerEditIndex],
        title: bannerForm.title, clickable: bannerForm.clickable, linkUrl: bannerForm.linkUrl, active: bannerForm.active,
        url: bannerForm.imageUrl, originalUrl: bannerForm.originalImageUrl || updated[bannerEditIndex].originalUrl,
        file: bannerForm.file || updated[bannerEditIndex].file,
        originalFile: bannerForm.originalFile || updated[bannerEditIndex].originalFile,
      };
    } else {
      updated = [...banners, {
        id: `temp-${Date.now()}`, url: bannerForm.imageUrl, originalUrl: bannerForm.originalImageUrl,
        title: bannerForm.title, clickable: bannerForm.clickable, linkUrl: bannerForm.linkUrl, active: bannerForm.active,
        file: bannerForm.file || undefined, originalFile: bannerForm.originalFile || undefined,
      }];
    }

    const success = await saveToAPI(updated);
    setIsLoading(false);
    if (success) { closeBannerModal(); MySwal.close(); window.location.reload(); }
  };

  const handleRemoveBanner = async (index: number) => {
    const result = await MySwal.fire({ title: 'ยืนยันการลบ?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', cancelButtonColor: '#d1d5db', confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก', reverseButtons: true });
    if (result.isConfirmed) {
      MySwal.fire({ title: 'กำลังลบ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const updated = [...banners]; updated.splice(index, 1);
      const success = await saveToAPI(updated);
      if (success) { setBanners(updated); MySwal.fire({ title: 'ลบสำเร็จ', icon: 'success', timer: 1200, showConfirmButton: false }); }
    }
  };

  const handleToggleBanner = async (index: number) => {
    const updated = [...banners]; updated[index] = { ...updated[index], active: !updated[index].active }; setBanners(updated);
    await saveToAPI(updated);
    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1200 });
    Toast.fire({ icon: 'success', title: updated[index].active ? 'เปิดแสดง' : 'ซ่อนแล้ว' });
  };

  const bannerDragStart = (i: number) => { bannerDrag.current = i; };
  const bannerDragEnter = (i: number) => {
    bannerDragOver.current = i;
    const copy = [...banners]; const item = copy[bannerDrag.current!];
    copy.splice(bannerDrag.current!, 1); copy.splice(i, 0, item);
    bannerDrag.current = i; setBanners(copy);
  };
  const bannerDragEnd = async () => { bannerDrag.current = null; bannerDragOver.current = null; await saveToAPI(banners); };

  // =============================================
  // RENDER
  // =============================================
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>จัดการหน้าแรก (เว็บเภสัชกร)</h2>
          <p className={styles.breadcrumb}>จัดการเว็บเภสัชกร / <span className="text-blue-600 font-medium">เนื้อหาหน้าแรก</span></p>
        </div>
      </div>

      <div className={styles.gridContainer}>

        {/* ===== BANNER SECTION ===== */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconBox} style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
              <ImageIcon size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 className={styles.cardTitle}>Banner Slideshow</h3>
              <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>ลากรูปเพื่อเปลี่ยนลำดับ • บันทึกอัตโนมัติ</p>
            </div>
            <button onClick={openBannerAdd} className={styles.addBannerBtn}><Plus size={18} /> เพิ่ม Banner</button>
          </div>

          <div className={styles.bannerList}>
            {banners.length === 0 && (
              <div className={styles.emptyBanner}>
                <ImageIcon size={48} style={{ color: '#d1d5db', marginBottom: '0.5rem' }} />
                <p>ยังไม่มี Banner — กดปุ่ม &quot;เพิ่ม Banner&quot; ด้านบน</p>
              </div>
            )}
            {banners.map((banner, index) => (
              <div key={banner.id} className={styles.bannerCard} draggable
                onDragStart={() => bannerDragStart(index)} onDragEnter={() => bannerDragEnter(index)}
                onDragEnd={bannerDragEnd} onDragOver={(e) => e.preventDefault()}
                style={{ opacity: banner.active ? 1 : 0.5 }}
              >
                <div className={styles.orderBadge}><GripVertical size={14} style={{ marginRight: '4px' }} /> ลำดับที่ {index + 1}</div>
                <img src={banner.url} className={styles.bannerImage} draggable={false} alt={banner.title || 'Banner image'} />
                <div className={styles.bannerInfo}>
                  <span className={styles.bannerTitle}>{banner.title || '(ไม่มีชื่อ)'}</span>
                  <div className={styles.bannerTags}>
                    <span className={banner.clickable ? styles.tagClickable : styles.tagNotClickable}>
                      <LinkIcon size={12} /> {banner.clickable ? 'กดได้' : 'กดไม่ได้'}
                    </span>
                  </div>
                </div>
                <div className={styles.bannerControls}>
                  <label className={styles.statusToggle} onClick={e => e.stopPropagation()}>
                    <div className={styles.switch}><input type="checkbox" checked={banner.active} onChange={() => handleToggleBanner(index)} /><span className={styles.slider}></span></div>
                    <span style={{ fontSize: '0.8rem' }}>{banner.active ? 'แสดง' : 'ซ่อน'}</span>
                  </label>
                  <div style={{ display: 'flex', gap: '0.25rem', marginLeft: 'auto' }}>
                    <button onClick={() => openBannerEdit(index)} className={styles.editBtn} title="แก้ไข"><Edit size={18} /></button>
                    <button onClick={() => handleRemoveBanner(index)} className={styles.deleteBtn} title="ลบ"><Trash2 size={18} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ===== BANNER MODAL ===== */}
      {isBannerModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{bannerEditIndex !== null ? 'แก้ไข Banner' : 'เพิ่ม Banner ใหม่'}</h3>
              <button onClick={closeBannerModal} className={styles.modalCloseBtn}><X size={22} /></button>
            </div>
            <div className={styles.modalBody}>
              <label className={styles.modalUploadArea}>
                {bannerForm.imageUrl ? (
                  <img src={bannerForm.imageUrl} className={styles.modalPreviewImage} alt="Preview" />
                ) : (
                  <div className={styles.modalUploadPlaceholder}>
                    <Upload size={36} /><span>คลิกเพื่อเพิ่มรูป Banner</span>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>แนะนำขนาด 16:9</span>
                  </div>
                )}
                <input type="file" hidden accept="image/*" onChange={onSelectBannerImage} />
              </label>
              {bannerForm.imageUrl && (
                <div className={styles.imageActionRow}>
                  <button onClick={() => { setImageToCrop(bannerForm.originalImageUrl || bannerForm.imageUrl); setIsCropping(true); setCrop({ x: 0, y: 0 }); setZoom(1); }} className={styles.changeImageBtn}>
                    <Crop size={14} /> ครอปใหม่
                  </button>
                  <button onClick={() => document.querySelector<HTMLInputElement>(`.${styles.modalUploadArea} input`)?.click()} className={styles.changeImageBtn}>
                    <Upload size={14} /> เปลี่ยนรูป
                  </button>
                </div>
              )}
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>ชื่อ Title</label>
                <input type="text" className={styles.modalInput} placeholder="ชื่อ Banner" value={bannerForm.title} onChange={e => setBannerForm(prev => ({ ...prev, title: e.target.value }))} />
              </div>
              <div className={styles.modalField}>
                <div className={styles.modalToggleRow}>
                  <span className={styles.modalLabel}>Banner กดได้</span>
                  <label className={styles.statusToggle}><div className={styles.switch}><input type="checkbox" checked={bannerForm.clickable} onChange={e => setBannerForm(prev => ({ ...prev, clickable: e.target.checked }))} /><span className={styles.slider}></span></div></label>
                </div>
              </div>
              {bannerForm.clickable && (
                <div className={styles.modalField}>
                  <label className={styles.modalLabel}>Link URL</label>
                  <input type="url" className={styles.modalInput} placeholder="https://example.com" value={bannerForm.linkUrl} onChange={e => setBannerForm(prev => ({ ...prev, linkUrl: e.target.value }))} />
                </div>
              )}
              <div className={styles.modalField}>
                <div className={styles.modalToggleRow}>
                  <span className={styles.modalLabel}>แสดง</span>
                  <label className={styles.statusToggle}><div className={styles.switch}><input type="checkbox" checked={bannerForm.active} onChange={e => setBannerForm(prev => ({ ...prev, active: e.target.checked }))} /><span className={styles.slider}></span></div></label>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button onClick={closeBannerModal} className={styles.btnModalCancel}>ยกเลิก</button>
              <button onClick={handleSaveBanner} disabled={isLoading} className={styles.btnModalSave}>{isLoading ? 'กำลังบันทึก...' : 'บันทึก'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== CROP MODAL ===== */}
      {isCropping && imageToCrop && (
        <div className={styles.cropModalOverlay}>
          <div className={styles.cropModalContent}>
            <div className={styles.cropperContainer}>
              <Cropper image={imageToCrop} crop={crop} zoom={zoom} aspect={16 / 9}
                onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom} />
            </div>
            <div className={styles.cropControls}>
              <div className={styles.zoomSliderContainer}>
                <ZoomOut size={20} color="#9ca3af" />
                <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className={styles.zoomSlider} />
                <ZoomIn size={20} color="#9ca3af" />
              </div>
              <div className={styles.cropActions}>
                <button onClick={() => { setIsCropping(false); setImageToCrop(null); }} className={styles.btnCropCancel}>ยกเลิก</button>
                <button onClick={handleConfirmCrop} className={styles.btnCropConfirm}>ครอปและบันทึก</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

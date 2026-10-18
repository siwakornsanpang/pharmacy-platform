'use client';

import React, { useState } from 'react';
import styles from '../../news/news.module.css';
import Editor from '@/app/components/editor/editor';
import { useRouter } from 'next/navigation';
import { authFetch } from '@/app/utils/authFetch';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/app/components/editor/cropImage';
import { Image as ImageIcon, Trash2, Crop, ZoomIn, ZoomOut, Save, X } from 'lucide-react';
import Swal from 'sweetalert2';

export type MedicineStatus = 'published' | 'draft';

export interface MedicineItem {
  id: number;
  title: string;
  content: string;
  status: MedicineStatus;
  thumbnailUrl?: string;
  publishedAt?: string;
  excerpt?: string;
}

interface MedicineFormProps {
  initialData?: MedicineItem;
  mode: 'create' | 'edit';
}

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/medicine`;

export default function MedicineForm({ initialData, mode }: MedicineFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState(initialData?.title || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [status, setStatus] = useState<MedicineStatus>(initialData?.status || 'draft');
  const [publishedAt, setPublishedAt] = useState(() => {
    if (initialData?.publishedAt) {
      const d = new Date(initialData.publishedAt);
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    }
    return '';
  });
  const [thumbnailUrl, setThumbnailUrl] = useState(initialData?.thumbnailUrl || '');
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || '');

  const [isCropping, setIsCropping] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);

  const onSelectThumbnail = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageToCrop(reader.result as string);
        setIsCropping(true);
      });
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const onCropComplete = (_: any, pixels: any) => {
    setCroppedAreaPixels(pixels);
  };

  const handleConfirmCrop = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    setIsUploadingThumbnail(true);
    try {
      const croppedFile = await getCroppedImg(imageToCrop, croppedAreaPixels, `medicine-thumb-${Date.now()}.jpg`);
      if (!croppedFile) throw new Error('Crop failed');

      const formData = new FormData();
      formData.append('file', croppedFile);

      const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/medicine/upload-image`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      setThumbnailUrl(data.url);
      setIsCropping(false);
      setImageToCrop(null);

      Swal.fire({
        icon: 'success',
        title: 'อัปโหลดรูปย่อสำเร็จ',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2000,
      });
    } catch (error) {
      console.error(error);
      Swal.fire('Error', 'อัปโหลดรูปไม่สำเร็จ', 'error');
    } finally {
      setIsUploadingThumbnail(false);
    }
  };

  const removeThumbnail = () => {
    setThumbnailUrl('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      Swal.fire('แจ้งเตือน', 'กรุณาระบุหัวข้อและเนื้อหา', 'warning');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title,
        content,
        status,
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
        thumbnailUrl: thumbnailUrl || null,
        excerpt: excerpt || null,
      };

      let url = API_URL;
      let method = 'POST';

      if (mode === 'edit' && initialData) {
        url = `${API_URL}/${initialData.id}`;
        method = 'PUT';
      }

      const res = await authFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Failed to save');
      }

      await Swal.fire({
        icon: 'success',
        title: 'บันทึกสำเร็จ',
        showConfirmButton: false,
        timer: 1500,
      });

      router.push('/backoffice/module/council-web/service/medicine');
      router.refresh();
    } catch (err: any) {
      console.error(err);
      Swal.fire('Error', err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    const hasChanges =
      title !== (initialData?.title || '') ||
      content !== (initialData?.content || '') ||
      status !== (initialData?.status || 'draft') ||
      thumbnailUrl !== (initialData?.thumbnailUrl || '') ||
      excerpt !== (initialData?.excerpt || '');

    let initialDate = '';
    if (initialData?.publishedAt) {
      const d = new Date(initialData.publishedAt);
      const offset = d.getTimezoneOffset() * 60000;
      initialDate = new Date(d.getTime() - offset).toISOString().slice(0, 16);
    }
    const dateChanged = publishedAt !== initialDate;

    if (hasChanges || dateChanged) {
      Swal.fire({
        title: 'ยืนยันการยกเลิก?',
        text: 'คุณยังไม่ได้บันทึกการเปลี่ยนแปลง ต้องการยกเลิกใช่หรือไม่?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#3b82f6',
        confirmButtonText: 'ใช่, ยกเลิกเลย',
        cancelButtonText: 'กลับไปแก้ไข',
        reverseButtons: true,
      }).then((result) => {
        if (result.isConfirmed) {
          router.back();
        }
      });
    } else {
      router.back();
    }
  };

  return (
    <form onSubmit={handleSave} className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{mode === 'create' ? 'เพิ่มบทความความรู้เรื่องยา' : 'แก้ไขบทความความรู้เรื่องยา'}</h1>
          <p className={styles.breadcrumb}>
            ความรู้เรื่องยา /{' '}
            <span className="text-blue-600 font-medium">
              {mode === 'create' ? 'เพิ่มบทความความรู้เรื่องยา' : 'แก้ไขบทความความรู้เรื่องยา'}
            </span>
          </p>
        </div>

        <div className={styles.headerActions}>
          <button type="button" className={`${styles.btn} ${styles.btnCancel}`} onClick={handleCancel}>
            <X size={18} /> ยกเลิก
          </button>
          <button type="submit" className={`${styles.btn} ${styles.btnSave}`} disabled={isSubmitting}>
            <Save size={18} /> {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </header>

      <div className={styles.layoutGrid}>
        <div className={styles.mainColumn}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>หัวข้อ</h3>
            <div className={styles.formGroup}>
              <input
                type="text"
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="ระบุหัวข้อบทความ..."
              />
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>เนื้อหาโดยย่อ</h3>
            <div className={styles.formGroup}>
              <textarea
                className={styles.textarea}
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="ระบุเนื้อหาโดยย่อ..."
                rows={3}
              />
            </div>
          </div>

          <div className={`${styles.card} ${styles.cardCompact}`}>
            <h3 className={styles.cardTitle} style={{ padding: '0.75rem 0.75rem 0 0.75rem', marginBottom: '0.5rem' }}>
              เนื้อหา
            </h3>
            <Editor value={content} onChange={setContent} placeholder="พิมพ์เนื้อหา หรือกดปุ่มรูปภาพเพื่ออัปโหลด..." />
          </div>
        </div>

        <div className={styles.sidebarColumn}>
          <div className={styles.card}>
            <h3 className={styles.cardTitle}>รูปหน้าปก</h3>
            <div className={styles.thumbnailContainer}>
              <div
                className={styles.thumbnailUploadArea}
                onClick={() => document.getElementById('medicine-thumb-input')?.click()}
              >
                {thumbnailUrl ? (
                  <img src={thumbnailUrl} className={styles.thumbnailPreview} alt="Thumbnail" />
                ) : (
                  <div className={styles.uploadPlaceholder}>
                    <ImageIcon size={32} />
                    <span>คลิกเพื่ออัปโหลดรูปหน้าปก</span>
                    <span style={{ fontSize: '0.7rem' }}>สัดส่วน 16:9</span>
                  </div>
                )}
              </div>
              <input
                id="medicine-thumb-input"
                type="file"
                hidden
                accept="image/*"
                onChange={onSelectThumbnail}
              />

              {thumbnailUrl && (
                <div className={styles.thumbnailActions}>
                  <button
                    type="button"
                    className={styles.thumbnailActionBtn}
                    onClick={() => {
                      setImageToCrop(thumbnailUrl);
                      setIsCropping(true);
                    }}
                  >
                    <Crop size={14} /> ครอปใหม่
                  </button>
                  <button
                    type="button"
                    className={styles.thumbnailActionBtn}
                    style={{ color: '#ef4444' }}
                    onClick={removeThumbnail}
                  >
                    <Trash2 size={14} /> ลบออก
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>การเผยแพร่</h3>

            <div className={styles.formGroup}>
              <label className={styles.label}>สถานะ</label>
              <select
                className={styles.modalSelect}
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="draft">ฉบับร่าง</option>
                <option value="published">เผยแพร่</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>วันที่เผยแพร่</label>
              <input
                type="datetime-local"
                className={styles.input}
                value={publishedAt}
                onChange={(e) => setPublishedAt(e.target.value)}
              />
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>การจัดหมวดหมู่</h3>
            <div className={styles.formGroup}>
              <label className={styles.label}>ประเภท</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioItem}>
                  <input type="radio" checked readOnly />
                  ความรู้เรื่องยา
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isCropping && imageToCrop && (
        <div className={styles.cropModalOverlay}>
          <div className={styles.cropModalContent}>
            <div className={styles.cropperContainer}>
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={16 / 9}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div className={styles.cropControls}>
              <div className={styles.zoomSliderContainer}>
                <ZoomOut size={20} />
                <input
                  type="range"
                  value={zoom}
                  min={1}
                  max={3}
                  step={0.1}
                  aria-labelledby="Zoom"
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className={styles.zoomSlider}
                />
                <ZoomIn size={20} />
              </div>
              <div className={styles.cropActions}>
                <button
                  type="button"
                  className={styles.btnCropCancel}
                  onClick={() => {
                    setIsCropping(false);
                    setImageToCrop(null);
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  className={styles.btnCropConfirm}
                  onClick={handleConfirmCrop}
                  disabled={isUploadingThumbnail}
                >
                  {isUploadingThumbnail ? 'กำลังอัปโหลด...' : 'ตกลงและบันทึก'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}


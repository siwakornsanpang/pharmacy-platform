'use client';

import React, { useState } from 'react';
import styles from './news.module.css';
import Editor from '@/app/components/editor/editor';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authFetch } from '@/app/utils/authFetch';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/app/components/editor/cropImage';
import { Image as ImageIcon, Upload, Trash2, Crop, ZoomIn, ZoomOut, Save, X } from 'lucide-react';
import Swal from 'sweetalert2';

// Types
export type NewsStatus = 'published' | 'draft';
export type NewsCategory = 'news' | 'recruitment' | 'procurement';

export interface NewsItem {
    id: number;
    title: string;
    content: string;
    category: NewsCategory;
    status: NewsStatus;
    isHighlight: boolean;
    thumbnailUrl?: string;
    publishedAt?: string;
    excerpt?: string;
}

interface NewsFormProps {
    initialData?: NewsItem;
    mode: 'create' | 'edit';
}

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/news`;

export default function NewsForm({ initialData, mode }: NewsFormProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State เหลือแค่นี้
    const [title, setTitle] = useState(initialData?.title || '');
    const [content, setContent] = useState(initialData?.content || '');
    const [category, setCategory] = useState<NewsCategory>(initialData?.category || 'news');
    const [status, setStatus] = useState<NewsStatus>(initialData?.status || 'draft');
    const [publishedAt, setPublishedAt] = useState(() => {
        if (initialData?.publishedAt) {
            const d = new Date(initialData.publishedAt);
            // Adjust to local ISO string for input[type="datetime-local"]
            const offset = d.getTimezoneOffset() * 60000;
            return new Date(d.getTime() - offset).toISOString().slice(0, 16);
        }
        return '';
    });
    const [isHighlight, setIsHighlight] = useState(initialData?.isHighlight || false);
    const [thumbnailUrl, setThumbnailUrl] = useState(initialData?.thumbnailUrl || '');
    const [excerpt, setExcerpt] = useState(initialData?.excerpt || '');

    // --- Crop States ---
    const [isCropping, setIsCropping] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isUploadingThumbnail, setIsUploadingThumbnail] = useState(false);


    // --- Thumbnail Logic ---
    const onSelectThumbnail = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImageToCrop(reader.result as string);
                setIsCropping(true);
            });
            reader.readAsDataURL(file);
            e.target.value = ''; // Reset input
        }
    };

    const onCropComplete = (_: any, pixels: any) => {
        setCroppedAreaPixels(pixels);
    };

    const handleConfirmCrop = async () => {
        if (!imageToCrop || !croppedAreaPixels) return;

        setIsUploadingThumbnail(true);
        try {
            const croppedFile = await getCroppedImg(imageToCrop, croppedAreaPixels, `news-thumb-${Date.now()}.jpg`);
            if (!croppedFile) throw new Error('Crop failed');

            // Upload to API
            const formData = new FormData();
            formData.append('file', croppedFile);

            const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/news/upload-image`, {
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
                timer: 2000
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

        // Validate
        if (!title.trim() || !content.trim()) {
            Swal.fire('แจ้งเตือน', 'กรุณาระบุหัวข้อและเนื้อหาข่าว', 'warning');
            return;
        }

        setIsSubmitting(true);

        try {


            // ✅ เปลี่ยนกลับมาส่ง JSON ปกติ (เพราะรูปเป็น URL ใน content แล้ว)
            const payload = {
                title,
                content,
                category,
                status,
                publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null, // ส่งเป็น ISO String หรือ null
                isHighlight: isHighlight,
                thumbnailUrl: thumbnailUrl || null,
                excerpt: excerpt || null
            };

            let url = API_URL;
            let method = 'POST';

            if (mode === 'edit' && initialData) {
                url = `${API_URL}/${initialData.id}`;
                method = 'PUT';
            }

            const res = await authFetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json', // ✅ สำคัญ: ต้องระบุว่าเป็น JSON
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
                timer: 1500
            });

            router.push('/backoffice/module/council-web/news');
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
            category !== (initialData?.category || 'news') ||
            status !== (initialData?.status || 'draft') ||
            isHighlight !== (initialData?.isHighlight || false) ||
            thumbnailUrl !== (initialData?.thumbnailUrl || '') ||
            excerpt !== (initialData?.excerpt || '');

        // Date comparison
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
                reverseButtons: true
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
                    <h1 className={styles.title}>{mode === 'create' ? 'เพิ่มข่าวใหม่' : 'แก้ไขข่าว'}</h1>
                    <p className={styles.breadcrumb}>
                        ข่าวประชาสัมพันธ์ / <span className="text-blue-600 font-medium">{mode === 'create' ? 'เพิ่มข่าวใหม่' : 'แก้ไขข่าว'}</span>
                    </p>
                </div>

                <div className={styles.headerActions}>
                    <button
                        type="button"
                        className={`${styles.btn} ${styles.btnCancel}`}
                        onClick={handleCancel}
                    >
                        <X size={18} /> ยกเลิก
                    </button>
                    <button
                        type="submit"
                        className={`${styles.btn} ${styles.btnSave}`}
                        disabled={isSubmitting}
                    >
                        <Save size={18} /> {isSubmitting ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                </div>
            </header>

            <div className={styles.layoutGrid}>
                {/* Main Content Column */}
                <div className={styles.mainColumn}>
                    {/* Title Input */}
                    <div className={styles.card}>
                        <h3 className={styles.cardTitle}>หัวข้อข่าว</h3>
                        <div className={styles.formGroup}>
                            <input
                                type="text"
                                className={styles.input}
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                required
                                placeholder="ระบุหัวข้อข่าว..."
                            />
                        </div>
                    </div>

                    {/* Excerpt Card */}
                    <div className={styles.card}>
                        <h3 className={styles.cardTitle}>เนื้อหาข่าวโดยย่อ</h3>
                        <div className={styles.formGroup}>
                            <textarea
                                className={styles.textarea}
                                value={excerpt}
                                onChange={e => setExcerpt(e.target.value)}
                                placeholder="ระบุเนื้อหาข่าวโดยย่อ..."
                                rows={3}
                            />
                        </div>
                    </div>




                    {/* Editor Card */}
                    <div className={`${styles.card} ${styles.cardCompact}`}>
                        <h3 className={styles.cardTitle} style={{ padding: '0.75rem 0.75rem 0 0.75rem', marginBottom: '0.5rem' }}>เนื้อหาข่าว</h3>
                        <Editor
                            value={content}
                            onChange={setContent}
                            placeholder="พิมพ์เนื้อหาข่าว หรือกดปุ่มรูปภาพเพื่ออัปโหลด..."
                        />
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className={styles.sidebarColumn}>

                    {/* Thumbnail Card */}
                    <div className={styles.card}>
                        <h3 className={styles.cardTitle}>รูปหน้าปก</h3>
                        <div className={styles.thumbnailContainer}>
                            <div
                                className={styles.thumbnailUploadArea}
                                onClick={() => document.getElementById('thumb-input')?.click()}
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
                                id="thumb-input"
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

                    {/* Publishing Card */}
                    <div className={styles.card}>
                        <h3 className={styles.cardTitle}>การเผยแพร่</h3>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>สถานะ</label>
                            <select
                                className={styles.modalSelect}
                                value={status}
                                onChange={e => setStatus(e.target.value as any)}
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
                                onChange={e => setPublishedAt(e.target.value)}
                            />
                        </div>

                        <div className={styles.formGroup} style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                            <label className={styles.label} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '8px' }}>
                                <input
                                    type="checkbox"
                                    checked={isHighlight}
                                    onChange={e => setIsHighlight(e.target.checked)}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                <span>⭐ข่าวเด่น</span>
                            </label>
                        </div>
                    </div>


                    {/* Categorization Card */}
                    <div className={styles.card}>
                        <h3 className={styles.cardTitle}>การจัดหมวดหมู่</h3>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>ประเภท</label>
                            <div className={styles.radioGroup}>
                                <label className={styles.radioItem}>
                                    <input
                                        type="radio"
                                        name="category"
                                        value="news"
                                        checked={category === 'news'}
                                        onChange={e => setCategory(e.target.value as any)}
                                    />
                                    ข่าวประชาสัมพันธ์
                                </label>
                                <label className={styles.radioItem}>
                                    <input
                                        type="radio"
                                        name="category"
                                        value="recruitment"
                                        checked={category === 'recruitment'}
                                        onChange={e => setCategory(e.target.value as any)}
                                    />
                                    ข่าวรับสมัครงานสภา
                                </label>
                                <label className={styles.radioItem}>
                                    <input
                                        type="radio"
                                        name="category"
                                        value="procurement"
                                        checked={category === 'procurement'}
                                        onChange={e => setCategory(e.target.value as any)}
                                    />
                                    ข่าวประกาศจัดซื้อจัดจ้าง
                                </label>
                            </div>
                        </div>


                    </div>
                </div>
            </div>

            {/* Crop Modal */}
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
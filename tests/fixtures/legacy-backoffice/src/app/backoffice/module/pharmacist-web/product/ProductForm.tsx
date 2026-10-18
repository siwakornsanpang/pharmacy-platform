'use client';

import React, { useState, useRef, useEffect } from 'react';
import styles from './product.module.css';
import { authFetch } from '@/app/utils/authFetch';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/app/components/editor/cropImage';
import { Trash2, Upload, Save, X, ZoomIn, ZoomOut, ChevronDown, Check, Plus } from 'lucide-react';
import Swal from 'sweetalert2';

export interface ProductItem {
    id: number;
    name: string;
    imageUrl?: string | null;
    category: string;
    description?: string | null;
    price: string;
    createdAt: string;
    updatedAt: string;
}

interface ProductFormProps {
    initialData?: ProductItem | null;
    mode: 'create' | 'edit';
    onClose: () => void;
    onSaveSuccess: () => void;
    existingCategories: string[];
}

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/products`;

// -------------------------------------------------------------------
// Custom Category Combobox — allows typing freely + select from list
// -------------------------------------------------------------------
interface CategoryComboboxProps {
    value: string;
    onChange: (val: string) => void;
    suggestions: string[];
    styles: any;
}

function CategoryCombobox({ value, onChange, suggestions, styles }: CategoryComboboxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState(value);
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync external value
    useEffect(() => { setQuery(value); }, [value]);

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = suggestions.filter(s => s.toLowerCase().includes(query.toLowerCase()));

    const handleSelect = (cat: string) => {
        setQuery(cat);
        onChange(cat);
        setIsOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        onChange(e.target.value);
        setIsOpen(true);
    };

    return (
        <div ref={containerRef} className={styles.comboboxContainer}>
            <div className={`${styles.comboboxInput} ${isOpen ? styles.comboboxInputOpen : ''}`}>
                <input
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    placeholder="พิมพ์หรือเลือกประเภท..."
                    className={styles.comboboxTextField}
                    required
                />
                <button
                    type="button"
                    className={styles.comboboxChevron}
                    onClick={() => setIsOpen(prev => !prev)}
                    tabIndex={-1}
                >
                    <ChevronDown size={16} style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </button>
            </div>

            {isOpen && (
                <div className={styles.comboboxDropdown}>
                    {filtered.length === 0 && query.length > 0 ? (
                        <div className={styles.comboboxNewItem} onMouseDown={() => handleSelect(query)}>
                            <Plus size={14} />
                            <span>เพิ่ม &quot;{query}&quot; เป็นประเภทใหม่</span>
                        </div>
                    ) : (
                        <>
                            {filtered.map(cat => (
                                <div
                                    key={cat}
                                    className={`${styles.comboboxOption} ${cat === value ? styles.comboboxOptionActive : ''}`}
                                    onMouseDown={() => handleSelect(cat)}
                                >
                                    <span>{cat}</span>
                                    {cat === value && <Check size={14} />}
                                </div>
                            ))}
                            {query.length > 0 && !filtered.some(f => f === query) && (
                                <div className={styles.comboboxNewItem} onMouseDown={() => handleSelect(query)}>
                                    <Plus size={14} />
                                    <span>เพิ่ม &quot;{query}&quot; เป็นประเภทใหม่</span>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default function ProductForm({ initialData, mode, onClose, onSaveSuccess, existingCategories }: ProductFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);

    // States for Form Fields
    const [name, setName] = useState(initialData?.name || '');
    const [category, setCategory] = useState(initialData?.category || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [price, setPrice] = useState(initialData?.price ? parseFloat(initialData.price).toString() : '');
    const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || '');

    // --- Crop States ---
    const [isCropping, setIsCropping] = useState(false);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    const onSelectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
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

        setIsUploadingImage(true);
        try {
            const croppedFile = await getCroppedImg(imageToCrop, croppedAreaPixels, `product-${Date.now()}.jpg`);
            if (!croppedFile) throw new Error('Crop failed');

            const formData = new FormData();
            formData.append('file', croppedFile);

            const res = await authFetch(`${API_URL}/upload-image`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();

            setImageUrl(data.url);
            setIsCropping(false);
            setImageToCrop(null);

            Swal.fire({
                icon: 'success',
                title: 'อัปโหลดรูปภาพสำเร็จ',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            });
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'อัปโหลดรูปภาพไม่สำเร็จ', 'error');
        } finally {
            setIsUploadingImage(false);
        }
    };

    const removeImage = () => {
        setImageUrl('');
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validations
        if (!name.trim()) {
            Swal.fire('แจ้งเตือน', 'กรุณาระบุชื่อสินค้า', 'warning');
            return;
        }
        if (!category.trim()) {
            Swal.fire('แจ้งเตือน', 'กรุณาระบุประเภทสินค้า', 'warning');
            return;
        }
        if (!price || parseFloat(price) < 0) {
            Swal.fire('แจ้งเตือน', 'กรุณาระบุราคาสินค้าที่ถูกต้อง', 'warning');
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                name,
                category: category.trim(),
                description: description || null,
                price: parseFloat(price),
                imageUrl: imageUrl || null
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
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to save product');
            }

            await Swal.fire({
                icon: 'success',
                title: 'บันทึกข้อมูลสินค้าสำเร็จ',
                showConfirmButton: false,
                timer: 1500
            });

            onSaveSuccess();
        } catch (err: any) {
            console.error(err);
            Swal.fire('เกิดข้อผิดพลาด', err.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSave} style={{ padding: '1.5rem' }}>
            <div className={styles.header} style={{ marginBottom: '1.5rem' }}>
                <h1 className={styles.title} style={{ fontSize: '1.5rem' }}>
                    {mode === 'create' ? 'เพิ่มสินค้าใหม่' : 'แก้ไขข้อมูลสินค้า'}
                </h1>
                <div className={styles.headerActions}>
                    <button type="button" onClick={onClose} className={`${styles.btn} ${styles.btnSecondary}`}>
                        ยกเลิก
                    </button>
                    <button type="submit" disabled={isSubmitting} className={`${styles.btn} ${styles.btnPrimary}`}>
                        <Save size={16} />
                        {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกสินค้า'}
                    </button>
                </div>
            </div>

            <div className={styles.layoutGrid} style={{ gridTemplateColumns: '1fr 300px' }}>
                {/* Main Column */}
                <div className={styles.mainColumn}>
                    <div className={styles.card} style={{ padding: '1.25rem' }}>
                        <h2 className={styles.cardTitle} style={{ fontSize: '1rem', marginBottom: '1rem' }}>ข้อมูลทั่วไป</h2>
                        
                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                ชื่อสินค้า <span className={styles.required}>*</span>
                            </label>
                            <input
                                type="text"
                                className={styles.input}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="เช่น พาราเซตามอล 500 มก."
                                required
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>รายละเอียดสินค้า</label>
                            <textarea
                                className={styles.textarea}
                                rows={5}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="ระบุรายละเอียด สรรพคุณ วิธีใช้ หรือข้อควรระวัง..."
                            />
                        </div>
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className={styles.sidebarColumn}>
                    <div className={styles.card} style={{ padding: '1.25rem' }}>
                        <h2 className={styles.cardTitle} style={{ fontSize: '1rem', marginBottom: '1rem' }}>ประเภทและราคา</h2>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                ประเภทสินค้า <span className={styles.required}>*</span>
                            </label>
                            <CategoryCombobox
                                value={category}
                                onChange={setCategory}
                                suggestions={existingCategories}
                                styles={styles}
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>
                                ราคาสินค้า (บาท) <span className={styles.required}>*</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                className={styles.input}
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="0.00"
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.card} style={{ padding: '1.25rem' }}>
                        <h2 className={styles.cardTitle} style={{ fontSize: '1rem', marginBottom: '1rem' }}>รูปภาพสินค้า</h2>
                        {imageUrl ? (
                            <div className={styles.previewContainer}>
                                <img src={imageUrl} alt="Product preview" className={styles.previewImage} />
                                <button type="button" className={styles.removeImageBtn} onClick={removeImage}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ) : (
                            <label className={styles.imageUploadArea}>
                                <Upload size={28} className={styles.placeholderIcon} />
                                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#64748b' }}>
                                    {isUploadingImage ? 'กำลังอัปโหลด...' : 'คลิกเพื่อเลือกรูปภาพสินค้า'}
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={onSelectImage}
                                    style={{ display: 'none' }}
                                    disabled={isUploadingImage}
                                />
                            </label>
                        )}
                    </div>
                </div>
            </div>

            {/* Cropper Modal */}
            {isCropping && imageToCrop && (
                <div className={styles.cropModal}>
                    <div className={styles.cropContainer}>
                        <div className={styles.cropHeader}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>ปรับขนาดรูปภาพ (1:1)</h3>
                            <button
                                type="button"
                                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                                onClick={() => { setIsCropping(false); setImageToCrop(null); }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className={styles.cropArea}>
                            <Cropper
                                image={imageToCrop}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                            />
                        </div>
                        <div className={styles.cropControls}>
                            <div className={styles.zoomSlider}>
                                <ZoomOut size={16} />
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    className={styles.slider}
                                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                                />
                                <ZoomIn size={16} />
                            </div>
                            <div className={styles.cropActions}>
                                <button
                                    type="button"
                                    className={`${styles.btn} ${styles.btnSecondary}`}
                                    onClick={() => { setIsCropping(false); setImageToCrop(null); }}
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.btn} ${styles.btnPrimary}`}
                                    onClick={handleConfirmCrop}
                                    disabled={isUploadingImage}
                                >
                                    {isUploadingImage && <span className={styles.loadingSpinner}></span>}
                                    ยืนยัน
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}

'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from './setting.module.css';
import { Save, Globe, Phone, Mail, MapPin, Facebook, LineChart, Instagram, Youtube, X, Settings, Share2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { authFetch } from '@/app/utils/authFetch';
import Image from 'next/image';

type TabType = 'general' | 'contact' | 'social';

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/web-settings`;

export default function SettingPage() {
    const [activeTab, setActiveTab] = useState<TabType>('general');
    const [isLoading, setIsLoading] = useState(false);
    const initialData = useRef<any>(null); // Added initialData ref
    const [isFetching, setIsFetching] = useState(true);

    // Form States
    const [settings, setSettings] = useState({
        // General
        siteNameTh: '',
        siteNameEn: '',
        slogan: '',
        logoPath: '',
        // Contact
        address: '',
        phone: '',
        fax: '',
        email: '',
        googleMapsUrl: '',
        googleMapsEmbed: '',
        // Social
        facebookUrl: '',
        lineId: '',
        youtubeUrl: ''
    });

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    // Fetch Initial Data
    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await authFetch(API_URL);
                if (res.ok) {
                    const data = await res.json();
                    setSettings(prev => ({
                        ...prev,
                        ...data
                    }));
                    initialData.current = data; // Set initialData
                    if (data.logoPath) {
                        setLogoPreview(data.logoPath);
                    }
                }
            } catch (error) {
                console.error('Fetch error:', error);
            } finally {
                setIsFetching(false);
            }
        };
        fetchSettings();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setLogoFile(file);
            setLogoPreview(URL.createObjectURL(file));
        }
    };

    const handleLogoClick = () => {
        fileInputRef.current?.click();
    };

    const handleCancel = () => {
        const hasChanges =
            JSON.stringify(settings) !== JSON.stringify(initialData.current) ||
            !!logoFile;

        if (hasChanges) {
            Swal.fire({
                title: 'คุณแน่ใจหรือไม่?',
                text: 'การเปลี่ยนแปลงที่คุณยังไม่ได้บันทึกจะถูกยกเลิก',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#3b82f6',
                confirmButtonText: 'ใช่, ยกเลิกการเปลี่ยนแปลง',
                cancelButtonText: 'ไม่, กลับไปแก้ไขต่อ'
            }).then((result) => {
                if (result.isConfirmed) {
                    setSettings({ ...initialData.current });
                    setLogoFile(null);
                    if (initialData.current.logoPath) {
                        setLogoPreview(initialData.current.logoPath);
                    } else {
                        setLogoPreview(null);
                    }
                    Swal.fire({
                        title: 'ยกเลิกแล้ว!',
                        text: 'การเปลี่ยนแปลงถูกยกเลิกเรียบร้อยแล้ว',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });
                }
            });
        }
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const formData = new FormData();

            // Append only allowed fields
            const allowedFields = [
                'siteNameTh', 'siteNameEn', 'slogan', 'logoPath',
                'address', 'phone', 'fax', 'email',
                'googleMapsUrl', 'googleMapsEmbed',
                'facebookUrl', 'lineId', 'youtubeUrl'
            ];

            allowedFields.forEach(key => {
                const value = (settings as any)[key];
                if (value !== null && value !== undefined) {
                    formData.append(key, value as string);
                }
            });

            // Append logo if changed
            if (logoFile) {
                formData.append('logo', logoFile);
            }

            const res = await authFetch(API_URL, {
                method: 'POST',
                body: formData // authFetch handles headers IF not multipart, but here we pass body directly
            });

            if (!res.ok) throw new Error('Failed to save');

            const result = await res.json();

            if (result.logoUrl) {
                setSettings(prev => ({ ...prev, logoPath: result.logoUrl }));
                setLogoPreview(result.logoUrl);
                setLogoFile(null);
            }
            initialData.current = { ...initialData.current, ...settings, logoPath: result.logoUrl || settings.logoPath }; // Update initialData after successful save

            Swal.fire({
                icon: 'success',
                title: 'บันทึกสำเร็จ',
                text: 'ข้อมูลการตั้งค่าถูกอัปเดตเรียบร้อยแล้ว',
                confirmButtonColor: '#2563eb'
            });
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'เกิดข้อผิดพลาด',
                text: 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่ภายหลัง'
            });
        } finally {
            setIsLoading(false);
        }
    };

    const renderTabContent = () => {
        if (isFetching) {
            return <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>;
        }

        switch (activeTab) {
            case 'general':
                return (
                    <div className={styles.formGrid}>
                        <h2 className={styles.tabTitle}>ข้อมูลพื้นฐานเว็บไซต์</h2>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>ชื่อหน่วยงาน (ภาษาไทย)</label>
                            <input
                                type="text"
                                name="siteNameTh"
                                className={styles.input}
                                value={settings.siteNameTh}
                                onChange={handleInputChange}
                                placeholder="ระบุชื่อหน่วยงานภาษาไทย..."
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>ชื่อหน่วยงาน (ภาษาอังกฤษ)</label>
                            <input
                                type="text"
                                name="siteNameEn"
                                className={styles.input}
                                value={settings.siteNameEn}
                                onChange={handleInputChange}
                                placeholder="ระบุชื่อหน่วยงานภาษาอังกฤษ..."
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>สโลแกน / คำขวัญหน่วยงาน</label>
                            <textarea
                                name="slogan"
                                className={styles.textarea}
                                value={settings.slogan}
                                onChange={handleInputChange}
                                placeholder="ระบุสโลแกนหรือคำขวัญที่จะแสดงใต้ชื่อหน่วยงาน..."
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>ตราสัญลักษณ์หน่วยงาน (Logo)</label>
                            <div className={styles.logoUploadArea}>
                                <div 
                                    className={`${styles.logoPreview} ${styles.clickable}`}
                                    onClick={handleLogoClick}
                                    title="คลิกเพื่ออัปโหลดโลโก้ใหม่"
                                >
                                    {logoPreview ? (
                                        <Image
                                            src={logoPreview}
                                            alt="Logo Preview"
                                            width={100}
                                            height={100}
                                            style={{ objectFit: 'contain' }}
                                        />
                                    ) : (
                                        <Settings size={40} color="#d1d5db" />
                                    )}
                                </div>
                                <div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        title="เลือกไฟล์โลโก้"
                                        style={{ display: 'none' }}
                                    />
                                    <p className={styles.uploadHint}>คลิกที่โลโก้เพื่ออัปโหลดใหม่ • แนะนำขนาด 512x512px ไฟล์ PNG หรือ JPG (พื้นหลังโปร่งใสจะดีที่สุด)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'contact':
                return (
                    <div className={styles.formGrid}>
                        <h2 className={styles.tabTitle}>ข้อมูลการติดต่อหน่วยงาน</h2>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>สถานที่ตั้ง / ที่อยู่สำนักงาน</label>
                            <textarea
                                name="address"
                                className={styles.textarea}
                                value={settings.address}
                                onChange={handleInputChange}
                                placeholder="ระบุเลขที่อาคาร, ชั้น, ถนน, แขวง, เขต, จังหวัด และรหัสไปรษณีย์..."
                            />
                        </div>

                        <div className={styles.formRow} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>หมายเลขโทรศัพท์</label>
                                <input
                                    type="text"
                                    name="phone"
                                    className={styles.input}
                                    value={settings.phone}
                                    onChange={handleInputChange}
                                    placeholder="เช่น 0-2591-9992"
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>หมายเลขโทรสาร (Fax)</label>
                                <input
                                    type="text"
                                    name="fax"
                                    className={styles.input}
                                    value={settings.fax}
                                    onChange={handleInputChange}
                                    placeholder="เช่น 0-2591-9996"
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>อีเมลติดต่อกลาง</label>
                            <input
                                type="email"
                                name="email"
                                className={styles.input}
                                value={settings.email}
                                onChange={handleInputChange}
                                placeholder="เช่น contact@pharmacycouncil.org"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>ที่ตั้งบน Google Maps (URL)</label>
                            <input
                                type="text"
                                name="googleMapsUrl"
                                className={styles.input}
                                value={settings.googleMapsUrl}
                                onChange={handleInputChange}
                                placeholder="คัดลอกลิงก์ (URL) จาก Google Maps เพื่อใช้เป็นลิงก์นำทาง..."
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>ที่ตั้งบน Google Maps (Embed Code)</label>
                            <input
                                type="text"
                                name="googleMapsEmbed"
                                className={styles.input}
                                value={settings.googleMapsEmbed}
                                onChange={handleInputChange}
                                placeholder="วางค่า 'src' จากโค้ด iframe ที่ได้จากเมนูแชร์แชร์ > ฝังแผนที่..."
                            />
                        </div>

                        {settings.googleMapsEmbed && (
                            <div className={styles.mapPreviewArea}>
                                <label className={styles.label}>ตัวอย่างการแสดงผลแผนที่หน้าเว็บไซต์</label>
                                <div className={styles.mapContainer}>
                                    <iframe
                                        title="ตัวอย่าง Google Maps"
                                        src={settings.googleMapsEmbed}
                                        width="100%"
                                        height="500"
                                        style={{ border: 0, borderRadius: '8px' }}
                                        allowFullScreen={true}
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                    ></iframe>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 'social':
                return (
                    <div className={styles.formGrid}>
                        <h2 className={styles.tabTitle}>บัญชีโซเชียลมีเดีย</h2>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Facebook Page (URL)</label>
                            <input
                                type="text"
                                name="facebookUrl"
                                className={styles.input}
                                value={settings.facebookUrl}
                                onChange={handleInputChange}
                                placeholder="เช่น https://www.facebook.com/pharmacycouncil"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Line Official Account (ID)</label>
                            <input
                                type="text"
                                name="lineId"
                                className={styles.input}
                                value={settings.lineId}
                                onChange={handleInputChange}
                                placeholder="เช่น @PharmacyCouncil"
                            />
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>YouTube Channel (URL)</label>
                            <input
                                type="text"
                                name="youtubeUrl"
                                className={styles.input}
                                value={settings.youtubeUrl}
                                onChange={handleInputChange}
                                placeholder="เช่น https://www.youtube.com/@pharmacycouncil"
                            />
                        </div>
                    </div>
                );


            default:
                return null;
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>การตั้งค่าส่วนหน้าเว็บ</h1>
                <p className={styles.breadcrumb}>
                    จัดการข้อมูลพื้นฐานและช่องทางการติดต่อที่แสดงบนเว็บไซต์หลัก
                </p>
            </header>

            <div className={styles.settingsCard}>
                {/* Sidebar Tabs */}
                <aside className={styles.tabsSidebar}>
                    <button
                        className={`${styles.tabButton} ${activeTab === 'general' ? styles.tabButtonActive : ''}`}
                        onClick={() => setActiveTab('general')}
                    >
                        <Settings size={20} />
                        ข้อมูลพื้นฐาน
                    </button>
                    <button
                        className={`${styles.tabButton} ${activeTab === 'contact' ? styles.tabButtonActive : ''}`}
                        onClick={() => setActiveTab('contact')}
                    >
                        <MapPin size={20} />
                        ข้อมูลติดต่อ
                    </button>
                    <button
                        className={`${styles.tabButton} ${activeTab === 'social' ? styles.tabButtonActive : ''}`}
                        onClick={() => setActiveTab('social')}
                    >
                        <Share2 size={20} />
                        โซเชียลมีเดีย
                    </button>

                </aside>

                {/* Content Area */}
                <div className={styles.tabContent}>
                    {renderTabContent()}

                    {!isFetching && (
                        <div className={styles.actions}>
                            {/* Added Cancel button */}
                            <button
                                type="button"
                                className={`${styles.btn} ${styles.btnCancel}`}
                                onClick={handleCancel}
                            >
                                <X size={18} />
                                ยกเลิก
                            </button>
                            {/* Modified Save button */}
                            <button
                                type="submit"
                                className={`${styles.btn} ${styles.btnPrimary}`}
                                onClick={handleSave}
                                disabled={isLoading}
                            >
                                {isLoading ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
                                <Save size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, User, Tag, Smartphone, Tablet, Laptop, Monitor } from 'lucide-react';
import styles from '../preview.module.css';
import 'react-quill-new/dist/quill.snow.css';
import { authFetch } from '@/app/utils/authFetch';

interface NewsItem {
    id: number;
    title: string;
    content: string;
    thumbnailUrl?: string;
    category: 'news' | 'recruitment' | 'procurement';
    status: 'published' | 'draft';
    publishedAt?: string;
    createdAt: string;
    updatedAt: string;
}

const API_URL = `${process.env.NEXT_PUBLIC_API_URL}/news`;

export default function NewsPreviewPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id;

    const [news, setNews] = useState<NewsItem | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'mobile' | 'tablet' | 'laptop' | 'desktop'>('laptop');

    useEffect(() => {
        const fetchNews = async () => {
            try {
                if (!id) return;
                const res = await authFetch(`${API_URL}/${id}`);
                if (!res.ok) throw new Error('Failed to fetch news data');
                const data = await res.json();
                setNews(data);
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'เกิดข้อผิดพลาดในการโหลดข้อมูล');
            } finally {
                setIsLoading(false);
            }
        };

        fetchNews();
    }, [id]);

    const formatDate = (dateString: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getCategoryLabel = (cat: string) => {
        switch (cat) {
            case 'news': return 'ข่าวประชาสัมพันธ์';
            case 'recruitment': return 'ข่าวรับสมัครงานสภา';
            case 'procurement': return 'ข่าวประกาศจัดซื้อจัดจ้าง';
            default: return cat;
        }
    };

    const renderSkeleton = () => (
        <div className={styles.previewContainer}>
            <div className={styles.deviceToolbar}>
                <div className={styles.backButton} style={{ opacity: 0.5 }}>
                    <ArrowLeft size={20} /> ย้อนกลับ
                </div>
                <div className={styles.deviceSelector} style={{ opacity: 0.5 }}>
                    <div className={styles.deviceBtn}><Smartphone size={18} /></div>
                    <div className={styles.deviceBtn}><Tablet size={18} /></div>
                    <div className={styles.deviceBtn}><Laptop size={18} /></div>
                    <div className={styles.deviceBtn}><Monitor size={18} /></div>
                </div>
                <div style={{ width: '80px' }}></div>
            </div>
            <div className={styles.viewportContainer}>
                <div className={`${styles.deviceFrame} ${styles[viewMode]}`}>
                    <div className={styles.articleWrapper}>
                        <div className={`${styles.skeleton} ${styles.skMeta}`} />
                        <div className={`${styles.skeleton} ${styles.skTitle}`} />
                        <div className={`${styles.skeleton} ${styles.skText}`} style={{ width: '100%' }} />
                        <div className={`${styles.skeleton} ${styles.skText}`} style={{ width: '90%' }} />
                        <div className={`${styles.skeleton} ${styles.skText}`} style={{ width: '95%' }} />
                        <div className={`${styles.skeleton} ${styles.skImage}`} />
                        <div className={`${styles.skeleton} ${styles.skText}`} style={{ width: '100%' }} />
                        <div className={`${styles.skeleton} ${styles.skText}`} style={{ width: '85%' }} />
                    </div>
                </div>
            </div>
        </div>
    );

    if (isLoading) return renderSkeleton();

    if (error || !news) {
        return (
            <div className={styles.previewContainer}>
                <div className={styles.errorContainer}>
                    <h2 className="text-2xl font-bold mb-2">ไม่พบข้อมูลข่าว</h2>
                    <p className="text-gray-600 mb-4">{error || 'ไม่สามารถค้นหาข่าวที่คุณต้องการได้'}</p>
                    <button onClick={() => router.back()} className={styles.backButton}>
                        <ArrowLeft size={20} /> กลับไปหน้าจัดการข่าว
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.previewContainer}>
            {/* Device Toolbar */}
            <div className={styles.deviceToolbar}>
                <button onClick={() => router.back()} className={styles.backButton}>
                    <ArrowLeft size={20} /> ย้อนกลับ
                </button>

                <div className={styles.deviceSelector}>
                    <button
                        className={`${styles.deviceBtn} ${viewMode === 'mobile' ? styles.deviceBtnActive : ''}`}
                        onClick={() => setViewMode('mobile')}
                        title="มือถือ"
                    >
                        <Smartphone size={18} />
                        <span className="hidden md:inline">มือถือ</span>
                    </button>
                    <button
                        className={`${styles.deviceBtn} ${viewMode === 'tablet' ? styles.deviceBtnActive : ''}`}
                        onClick={() => setViewMode('tablet')}
                        title="ไอแพด"
                    >
                        <Tablet size={18} />
                        <span className="hidden md:inline">ไอแพด</span>
                    </button>
                    <button
                        className={`${styles.deviceBtn} ${viewMode === 'laptop' ? styles.deviceBtnActive : ''}`}
                        onClick={() => setViewMode('laptop')}
                        title="โน้ตบุ๊ค"
                    >
                        <Laptop size={18} />
                        <span className="hidden md:inline">โน้ตบุ๊ค</span>
                    </button>
                    <button
                        className={`${styles.deviceBtn} ${viewMode === 'desktop' ? styles.deviceBtnActive : ''}`}
                        onClick={() => setViewMode('desktop')}
                        title="เดสก์ท็อป"
                    >
                        <Monitor size={18} />
                        <span className="hidden md:inline">เดสก์ท็อป</span>
                    </button>
                </div>

                <div style={{ width: '80px' }}></div> {/* Spacer for symmetry */}
            </div>

            <div className={styles.viewportContainer}>
                <div className={`${styles.deviceFrame} ${styles[viewMode]}`}>
                    <div className={styles.articleWrapper}>
                        {news.thumbnailUrl ? (
                            <div className={styles.bannerContainer}>
                                <img src={news.thumbnailUrl} className={styles.bannerImage} alt="Banner" />
                                <div className={styles.bannerOverlay}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={styles.categoryTag}>
                                            {getCategoryLabel(news.category)}
                                        </span>
                                    </div>
                                    <h1 className={styles.bannerTitle}>{news.title}</h1>
                                    <div className={styles.bannerMeta}>
                                        {news.status === 'published' && (
                                            <span className={styles.publishDate}>
                                                <Calendar size={18} />
                                                {formatDate(news.publishedAt || news.createdAt)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.articleInner}>
                                <header className={styles.header}>
                                    <div className={styles.meta}>
                                        <span className={styles.categoryTag}>
                                            {getCategoryLabel(news.category)}
                                        </span>
                                        {news.status === 'published' && (
                                            <span className={styles.publishDate}>
                                                <Calendar size={16} />
                                                เผยแพร่เมื่อวันที่ {formatDate(news.publishedAt || news.createdAt)}
                                            </span>
                                        )}
                                    </div>
                                    <h1 className={styles.title}>{news.title}</h1>
                                </header>
                            </div>
                        )}

                        <div className={styles.articleInner} style={{ paddingTop: news.thumbnailUrl ? '2rem' : 0 }}>
                            {news.status === 'draft' && (
                                <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-center text-sm">
                                    นี่คือ "ฉบับร่าง" ยังไม่ได้เผยแพร่สู่สาธารณะ
                                </div>
                            )}

                            {/* Render HTML content safely with Quill styles */}
                            <article className={`${styles.content} ql-snow news-preview-content`}>
                                <div
                                    className="ql-editor"
                                    dangerouslySetInnerHTML={{ __html: news.content }}
                                />
                            </article>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

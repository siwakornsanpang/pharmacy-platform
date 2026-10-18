'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Calendar, ArrowRight } from 'lucide-react';
import { News } from '@/lib/api';
import styles from './FeaturedNews.module.css';

interface FeaturedNewsProps {
    news: News[];
    /** Show “ดูทั้งหมด” link (homepage). Default true. */
    showViewAll?: boolean;
}

const categoryStyles: Record<string, { bg: string; text: string; border: string }> = {
    news: {
        bg: '#dbeafe',
        text: '#1e40af',
        border: '#bfdbfe',
    },
    recruitment: {
        bg: '#dcfce7',
        text: '#166534',
        border: '#bbf7d0',
    },
    procurement: {
        bg: '#ffedd5',
        text: '#9a3412',
        border: '#fed7aa',
    },
};

const categoryLabels: Record<string, string> = {
    news: 'ข่าวประชาสัมพันธ์',
    recruitment: 'ข่าวรับสมัครงานสภา',
    procurement: 'ข่าวประกาศจัดซื้อจัดจ้าง',
};

export default function FeaturedNews({ news, showViewAll = false }: FeaturedNewsProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const nextNews = useCallback(() => {
        setCurrentIndex((prev) => (prev + 1) % news.length);
    }, [news.length]);

    useEffect(() => {
        if (news.length <= 1 || isPaused) return;

        const timer = setInterval(() => {
            nextNews();
        }, 5000);

        return () => clearInterval(timer);
    }, [news.length, isPaused, nextNews]);

    const current = news[currentIndex];

    if (!current) return null;

    const styleInfo = categoryStyles[current.category] || categoryStyles.news;

    return (
        <div
            className={`${styles.container} ${showViewAll ? styles.home : ""}`}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
        >
            <div className={styles.header}>
                <h2 className={styles.sectionTitle}>เรื่องเด่น</h2>
                {showViewAll && (
                    <Link href="/news" className={styles.viewAll}>
                        ดูทั้งหมด
                        <ArrowRight size={18} strokeWidth={2} />
                    </Link>
                )}
            </div>

            <div className={styles.card} key={currentIndex}>
                <div className={`${styles.imageSection} ${styles.fadeIn}`}>
                    <span className={styles.featuredMark}>เรื่องเด่น</span>
                    {current.thumbnailUrl ? (
                        <Image
                            src={current.thumbnailUrl}
                            alt={current.title}
                            fill
                            className={styles.image}
                        />
                    ) : (
                        <div className={styles.placeholder} />
                    )}
                </div>
                <div className={`${styles.contentSection} ${styles.slideUp}`}>
                    <div className={styles.badgeRow}>
                        <span
                            className={styles.badge}
                            style={{
                                '--badge-bg': styleInfo.bg,
                                '--badge-color': styleInfo.text,
                                '--badge-border': styleInfo.border,
                            } as React.CSSProperties}
                        >
                            {categoryLabels[current.category] || current.category}
                        </span>
                        <span className={styles.date}>
                            <Calendar size={14} className={styles.dateIcon} />
                            {new Date(current.publishedAt || current.createdAt).toLocaleDateString('th-TH', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </span>
                    </div>
                    <h3 className={styles.title}>{current.title}</h3>
                    <p className={styles.content}>{current.excerpt}</p>
                    <Link href={`/news/${current.id}`} className={`${styles.readMore} ThaiFont`}>
                        อ่านเพิ่มเติม
                    </Link>
                </div>
                <Link href={`/news/${current.id}`} className={styles.cardHit} tabIndex={-1} aria-hidden />
            </div>

            {news.length > 1 && (
                <div className={styles.dots}>
                    {news.map((_, idx) => (
                        <button
                            key={idx}
                            type="button"
                            className={`${styles.dot} ${idx === currentIndex ? styles.activeDot : ''}`}
                            onClick={() => setCurrentIndex(idx)}
                            aria-label={`ไปที่ข่าวที่ ${idx + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

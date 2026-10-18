'use client';

import { useState, useMemo, useEffect } from 'react';
import { News, NewsCategory } from '@/lib/api';
import NewsCard from './NewsCard';
import FeaturedNews from './FeaturedNews';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './NewsContainer.module.css';

interface NewsContainerProps {
    allNews: News[];
}

const categories: { label: string; value: NewsCategory | 'all' }[] = [
    { label: 'ข่าวทั้งหมด', value: 'all' },
    { label: 'ข่าวประชาสัมพันธ์', value: 'news' },
    { label: 'ข่าวรับสมัครงานสภา', value: 'recruitment' },
    { label: 'ข่าวประกาศจัดซื้อจัดจ้าง', value: 'procurement' },
];

export default function NewsContainer({ allNews }: NewsContainerProps) {
    const [activeTab, setActiveTab] = useState<NewsCategory | 'all'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9;

    // Filter only published news
    const publishedNews = useMemo(() => allNews.filter(n => n.status === 'published'), [allNews]);

    // Filter highlights for the featured section
    const highlights = useMemo(() => publishedNews.filter(n => n.isHighlight), [publishedNews]);

    // Get highlight IDs to exclude them from the main list below
    const highlightIds = useMemo(() => new Set(highlights.map(h => h.id)), [highlights]);

    // Filter and sort general news (excluding highlights)
    const filteredNews = useMemo(() => {
        const base = publishedNews.filter(n => !highlightIds.has(n.id));
        const filtered = activeTab === 'all'
            ? base
            : base.filter(n => n.category === activeTab);

        return [...filtered].sort((a, b) => {
            const dateA = new Date(a.publishedAt || a.createdAt).getTime();
            const dateB = new Date(b.publishedAt || b.createdAt).getTime();
            return dateB - dateA;
        });
    }, [publishedNews, highlightIds, activeTab]);

    // Pagination logic
    const totalPages = Math.ceil(filteredNews.length / itemsPerPage);
    const paginatedNews = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredNews.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredNews, currentPage]);

    // Reset pagination when tab changes
    const handleTabChange = (value: NewsCategory | 'all') => {
        setActiveTab(value);
        setCurrentPage(1);
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                setCurrentPage(prev => Math.max(1, prev - 1));
            } else if (e.key === 'ArrowRight') {
                setCurrentPage(prev => Math.min(totalPages, prev + 1));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [totalPages]);

    // Helper to generate page numbers
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            // Show first, last, current and neighbors
            pages.push(1);
            if (currentPage > 3) pages.push('...');

            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i);
            }

            if (currentPage < totalPages - 2) pages.push('...');
            if (!pages.includes(totalPages)) pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className={styles.wrapper}>
            {/* Featured Section */}
            {highlights.length > 0 && (
                <div className={styles.featuredSection}>
                    <FeaturedNews news={highlights} />
                </div>
            )}

            {/* Main News Section */}
            <div className={styles.mainSection}>
                <div className={styles.tabsContainer}>
                    <div className={styles.tabs}>
                        {categories.map((cat) => (
                            <button
                                key={cat.value}
                                className={`${styles.tab} ${activeTab === cat.value ? styles.activeTab : ''}`}
                                onClick={() => handleTabChange(cat.value)}
                            >
                                {cat.label}
                                {activeTab === cat.value && <div className={styles.activeLine} />}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={styles.grid}>
                    {paginatedNews.length > 0 ? (
                        paginatedNews.map((news) => (
                            <NewsCard key={news.id} news={news} />
                        ))
                    ) : (
                        <div className={styles.emptyState}>
                            ยังไม่มีข่าวสารในหมวดหมู่นี้
                        </div>
                    )}
                </div>

                {/* Pagination UI */}
                {totalPages > 1 && (
                    <div className={styles.pagination}>
                        <button
                            className={styles.pageArrow}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            aria-label="หน้าก่อนหน้า"
                            title="หน้าก่อนหน้า"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        {getPageNumbers().map((page, idx) => (
                            page === '...' ? (
                                <span key={`ellipsis-${idx}`} className={styles.ellipsis}>{page}</span>
                            ) : (
                                <button
                                    key={`page-${page}`}
                                    className={`${styles.pageBtn} ${currentPage === page ? styles.activePage : ''}`}
                                    onClick={() => setCurrentPage(page as number)}
                                >
                                    {page}
                                </button>
                            )
                        ))}

                        <button
                            className={styles.pageArrow}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            aria-label="หน้าถัดไป"
                            title="หน้าถัดไป"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

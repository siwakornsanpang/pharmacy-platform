'use client';

import { useState, useMemo, useEffect } from 'react';
import DocumentSearch from '@/components/public/08_other-service/DocumentSearch';
import styles from '@/app/(public)/08_other-service/other-service.module.css';
import { OtherServiceCategory, OtherServiceItem } from '@/lib/api';
import { Download, FileText } from 'lucide-react';

interface OtherServiceContentProps {
    categories: OtherServiceCategory[];
    items: OtherServiceItem[];
}

export default function OtherServiceContent({ categories, items }: OtherServiceContentProps) {
    const sortedCategories = useMemo(
        () => [...categories].sort((a, b) => a.order - b.order),
        [categories]
    );

    const [activeCategory, setActiveCategory] = useState<OtherServiceCategory | null>(
        sortedCategories[0] ?? null
    );
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        if (!activeCategory && sortedCategories.length > 0) {
            setActiveCategory(sortedCategories[0]);
        }
    }, [activeCategory, sortedCategories]);

    const categoryItems = useMemo(() => {
        if (!activeCategory) return [];
        return items
            .filter((item) => item.categoryId === activeCategory.id && item.status === 'online')
            .sort((a, b) => a.order - b.order);
    }, [items, activeCategory]);

    const filteredItems = useMemo(() => {
        return categoryItems.filter((item) => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());

            let matchesType = true;
            if (filterType === 'forms') {
                matchesType = /แบบฟอร์ม|ใบสมัคร|คำขอ|กศภ\./i.test(item.name);
            } else if (filterType === 'manuals') {
                matchesType = /คู่มือ|แนวทาง|ขั้นตอน|เกณฑ์/i.test(item.name);
            }

            return matchesSearch && matchesType;
        });
    }, [categoryItems, searchQuery, filterType]);

    useEffect(() => {
        setCurrentPage(1);
    }, [activeCategory, searchQuery, filterType]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredItems.slice(start, start + itemsPerPage);
    }, [filteredItems, currentPage]);

    return (
        <>
            <section className={styles.searchSection}>
                <div className={styles.searchContainer}>
                    <DocumentSearch
                        query={searchQuery}
                        setQuery={setSearchQuery}
                        filterType={filterType}
                        setFilterType={setFilterType}
                    />
                </div>
            </section>

            <div className={styles.container}>
                <div className={styles.contentLayout}>
                    <aside className={styles.sidebar}>
                        <h2 className={`${styles.sidebarTitle} ThaiFont`}>
                            <span className={styles.sidebarTitleDesktop}>ดาวน์โหลด</span>
                            <span className={styles.sidebarTitlePhone}>ประเภทกฎหมาย</span>
                        </h2>
                        {sortedCategories.length === 0 ? (
                            <div style={{ color: '#9ca3af', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>
                                ไม่มีหมวดหมู่
                            </div>
                        ) : (
                            <ul className={styles.categoryList}>
                                {sortedCategories.map((cat) => (
                                    <li key={cat.id}>
                                        <button
                                            className={`${styles.categoryBtn} ${activeCategory?.id === cat.id ? styles.activeCategory : ''} ThaiFont`}
                                            onClick={() => setActiveCategory(cat)}
                                        >
                                            {cat.name}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </aside>

                    <main className={styles.mainContent}>
                        <h1 className={`${styles.contentTitle} ThaiFont`}>
                            {activeCategory ? activeCategory.name : 'ดาวน์โหลดเอกสาร'}
                        </h1>
                        <p className={`${styles.resultCount} ThaiFont`}>{filteredItems.length} รายการ</p>

                        <div className={styles.docListContainer}>
                            <h3 className={`${styles.docListHeader} ThaiFont`}>รายการ</h3>

                            {paginatedItems.length === 0 ? (
                                <div style={{ color: '#6b7280', textAlign: 'center', padding: '3rem 0', background: '#f9fafb', borderRadius: '12px', border: '1px dashed #e5e7eb' }}>
                                    <FileText size={32} style={{ color: '#d1d5db', margin: '0 auto 0.5rem' }} />
                                    <p className="ThaiFont">ไม่พบเอกสารดาวน์โหลดในหมวดหมู่นี้</p>
                                </div>
                            ) : (
                                <ul className={styles.docList}>
                                    {paginatedItems.map((item) => (
                                        <li key={item.id} className={`${styles.docItem} ThaiFont`}>
                                            {item.pdfUrl ? (
                                                <a
                                                    href={item.pdfUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'inherit', textDecoration: 'none' }}
                                                >
                                                    <Download size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                                                    <span>{item.name}</span>
                                                </a>
                                            ) : (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.6 }}>
                                                    <FileText size={16} style={{ flexShrink: 0 }} />
                                                    <span>{item.name} (ไม่มีไฟล์แนบ)</span>
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {totalPages > 1 && (
                            <div className={styles.pagination}>
                                <button
                                    className={styles.pageBtn}
                                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    style={{ opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                                >
                                    &lt;
                                </button>
                                {Array.from({ length: totalPages }).map((_, i) => {
                                    const pageNum = i + 1;
                                    return (
                                        <button
                                            key={pageNum}
                                            className={`${styles.pageBtn} ${currentPage === pageNum ? styles.activePageBtn : ''}`}
                                            onClick={() => setCurrentPage(pageNum)}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                <button
                                    className={styles.pageBtn}
                                    onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage === totalPages}
                                    style={{ opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                                >
                                    &gt;
                                </button>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </>
    );
}

'use client';

import { useState, useMemo, useEffect } from 'react';
import { PublicProject } from '@/lib/api';
import PeopleProjectCard from './PeopleProjectCard';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import styles from './PeopleProjectContainer.module.css';

interface PeopleProjectContainerProps {
    allProjects: PublicProject[];
}

export default function PeopleProjectContainer({ allProjects }: PeopleProjectContainerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9; // Show 9 projects per page in a 3x3 grid

    // Filter only published projects
    const publishedProjects = useMemo(() => {
        return allProjects.filter(p => p.status === 'published');
    }, [allProjects]);

    // Sort projects by date (newest first)
    const sortedProjects = useMemo(() => {
        return [...publishedProjects].sort((a, b) => {
            const dateA = new Date(a.publishedAt || a.createdAt).getTime();
            const dateB = new Date(b.publishedAt || b.createdAt).getTime();
            return dateB - dateA;
        });
    }, [publishedProjects]);

    // Filter projects by search query (all projects included)
    const filteredProjects = useMemo(() => {
        if (!searchQuery.trim()) return sortedProjects;
        const query = searchQuery.toLowerCase();
        return sortedProjects.filter(p => 
            p.title.toLowerCase().includes(query) || 
            (p.excerpt && p.excerpt.toLowerCase().includes(query))
        );
    }, [sortedProjects, searchQuery]);

    // Pagination logic for projects
    const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
    const paginatedProjects = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredProjects.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredProjects, currentPage]);

    // Reset pagination when search query changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    // Keyboard navigation for pagination
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
            {/* Main Projects List Section */}
            <div className={styles.mainSection}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>
                        {searchQuery ? `ผลการค้นหาสำหรับ "${searchQuery}"` : 'โครงการทั้งหมด'}
                    </h2>
                    
                    {/* Search Bar */}
                    <div className={styles.searchContainer}>
                        <Search size={18} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="ค้นหาโครงการ..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={`${styles.searchInput} ThaiFont`}
                        />
                    </div>
                </div>

                <div className={styles.grid}>
                    {paginatedProjects.length > 0 ? (
                        paginatedProjects.map((project) => (
                            <PeopleProjectCard key={project.id} project={project} />
                        ))
                    ) : (
                        <div className={styles.emptyState}>
                            ไม่พบโครงการที่ตรงกับการค้นหา
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

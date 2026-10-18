"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import JobCard from './JobCard';
import styles from './JobListing.module.css';

interface JobListingProps {
    jobs: any[];
    organizationFilter?: string;
    onFilterChange?: (value: string) => void;
    organizations?: string[];
}

const SORT_OPTIONS = [
    { value: 'latest', label: 'ล่าสุด' },
    { value: 'salary_desc', label: 'เงินเดือน (สูง-ต่ำ)' },
    { value: 'salary_asc', label: 'เงินเดือน (ต่ำ-สูง)' },
];

export default function JobListing({ jobs, organizationFilter = '', onFilterChange, organizations = [] }: JobListingProps) {
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [isOrgOpen, setIsOrgOpen] = useState(false);
    const [sortBy, setSortBy] = useState('latest');
    const sortRef = useRef<HTMLDivElement>(null);
    const orgRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
                setIsSortOpen(false);
            }
            if (orgRef.current && !orgRef.current.contains(event.target as Node)) {
                setIsOrgOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const currentSortLabel = SORT_OPTIONS.find(opt => opt.value === sortBy)?.label;

    return (
        <section className={styles.section}>
            <div className={styles.sectionHeader}>
                <div className={styles.headerLeft}>
                        <div className={styles.sortContainer} ref={orgRef}>
                            <span className={`${styles.sortLabel} ThaiFont`}>องค์กร:</span>
                            <div className={styles.dropdownWrapper}>
                                <button 
                                    className={`${styles.sortSelect} ThaiFont`}
                                    onClick={() => setIsOrgOpen(!isOrgOpen)}
                                >
                                    <span>{organizationFilter || 'ทั้งหมด'}</span>
                                    <ChevronDown size={16} className={`${styles.chevron} ${isOrgOpen ? styles.chevronRotate : ''}`} />
                                </button>
                                
                                {isOrgOpen && (
                                    <ul className={styles.dropdownMenu}>
                                        <li>
                                            <button
                                                className={`${styles.dropdownItem} ${!organizationFilter ? styles.active : ''} ThaiFont`}
                                                onClick={() => {
                                                    onFilterChange?.('');
                                                    setIsOrgOpen(false);
                                                }}
                                            >
                                                ทั้งหมด
                                            </button>
                                        </li>
                                        {organizations.map(org => (
                                            <li key={org}>
                                                <button
                                                    className={`${styles.dropdownItem} ${organizationFilter === org ? styles.active : ''} ThaiFont`}
                                                    onClick={() => {
                                                        onFilterChange?.(org);
                                                        setIsOrgOpen(false);
                                                    }}
                                                >
                                                    {org}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div className={styles.sortContainer} ref={sortRef}>
                            <span className={`${styles.sortLabel} ThaiFont`}>เรียงตาม:</span>
                        <div className={styles.dropdownWrapper}>
                            <button 
                                className={`${styles.sortSelect} ThaiFont`}
                                onClick={() => setIsSortOpen(!isSortOpen)}
                            >
                                <span>{currentSortLabel}</span>
                                <ChevronDown size={16} className={`${styles.chevron} ${isSortOpen ? styles.chevronRotate : ''}`} />
                            </button>
                            
                            {isSortOpen && (
                                <ul className={styles.dropdownMenu}>
                                    {SORT_OPTIONS.map(opt => (
                                        <li key={opt.value}>
                                            <button
                                                className={`${styles.dropdownItem} ${sortBy === opt.value ? styles.active : ''} ThaiFont`}
                                                onClick={() => {
                                                    setSortBy(opt.value);
                                                    setIsSortOpen(false);
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
                <h2 className={`${styles.resultCount} ThaiFont`}>พบงานทั้งหมด {jobs.length} ตำแหน่ง</h2>
            </div>
            
            <div className={styles.jobGrid}>
                {jobs.map(job => (
                    <JobCard key={job.id} job={job} />
                ))}
            </div>

            {/* Pagination removed for now */}
        </section>
    );
}

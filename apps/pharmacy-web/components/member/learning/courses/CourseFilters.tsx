'use client';

import React, { useState } from 'react';
import { Search, ChevronDown, ListFilter } from 'lucide-react';
import styles from './CourseFilters.module.css';

interface CourseFiltersProps {
    categories: string[];
    selectedCategory: string;
    searchTerm: string;
    onCategoryChange: (category: string) => void;
    onSearchChange: (term: string) => void;
}

export default function CourseFilters({
    categories,
    selectedCategory,
    searchTerm,
    onCategoryChange,
    onSearchChange
}: CourseFiltersProps) {
    const [catDropdownOpen, setCatDropdownOpen] = useState(false);

    return (
        <div className={styles.wrapper}>
            <div className={styles.header}>
                <h2 className={styles.title}>ค้นหาคอร์สเรียน</h2>
                <span className={styles.subtitle}>ค้นหาหลักสูตรที่คุณสนใจเพื่อพัฒนาวิชาชีพ</span>
            </div>

            <div className={styles.searchRow}>
                {/* Category Dropdown */}
                <div className={styles.dropdown}>
                    <button
                        type="button"
                        className={styles.dropdownButton}
                        onClick={() => {
                            setCatDropdownOpen(!catDropdownOpen);
                        }}
                    >
                        <ListFilter size={16} className={styles.dropdownIcon} />
                        <span>{selectedCategory}</span>
                        <ChevronDown size={16} className={`${styles.chevron} ${catDropdownOpen ? styles.chevronRotate : ''}`} />
                    </button>
                    {catDropdownOpen && (
                        <ul className={styles.dropdownMenu}>
                            {categories.map(cat => (
                                <li key={cat}>
                                    <button
                                        type="button"
                                        className={`${styles.dropdownItem} ${cat === selectedCategory ? styles.dropdownItemActive : ''}`}
                                        onClick={() => {
                                            onCategoryChange(cat);
                                            setCatDropdownOpen(false);
                                        }}
                                    >
                                        {cat}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Search input */}
                <div className={styles.inputWrap}>
                    <Search size={18} className={styles.inputIcon} />
                    <input
                        type="text"
                        className={styles.input}
                        placeholder="ชื่อคอร์ส, วิทยากร หรือเนื้อหา..."
                        value={searchTerm}
                        onChange={e => onSearchChange(e.target.value)}
                    />
                </div>

                {/* Search button */}
                <button
                    type="button"
                    className={styles.searchButton}
                >
                    ค้นหา
                </button>
            </div>
        </div>
    );
}

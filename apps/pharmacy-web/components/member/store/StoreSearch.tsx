"use client";

import React from 'react';
import { Search } from 'lucide-react';
import styles from './StoreSearch.module.css';

interface StoreSearchProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    onSearchSubmit?: () => void;
}

export default function StoreSearch({
    searchTerm,
    onSearchChange,
    onSearchSubmit
}: StoreSearchProps) {
    return (
        <div className={styles.filterCard}>
            <div className={styles.filterHeader}>
                <h2 className={`${styles.filterTitle} ThaiFont`}>ค้นหาสินค้า</h2>
                <span className={`${styles.filterSubtitle} ThaiFont`}>ค้นหาสินค้าที่คุณสนใจ เช่น ตำรา, อุปกรณ์, หรือเครื่องแบบ</span>
            </div>
            
            <form 
                className={styles.filterRow}
                onSubmit={(e) => {
                    e.preventDefault();
                    if (onSearchSubmit) onSearchSubmit();
                }}
            >
                {/* Search Input */}
                <div className={styles.inputWrap}>
                    <Search size={18} className={styles.inputIcon} />
                    <input
                        type="text"
                        className={`${styles.input} ThaiFont`}
                        placeholder="ชื่อสินค้า..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>

                {/* Search Button */}
                <button type="submit" className={`${styles.searchButton} ThaiFont`}>
                    ค้นหา
                </button>
            </form>
        </div>
    );
}

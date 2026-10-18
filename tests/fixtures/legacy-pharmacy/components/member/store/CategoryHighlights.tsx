"use client";

import React from 'react';
import { LayoutGrid, BookOpen, Shirt, Shield, Gift } from 'lucide-react';
import styles from './CategoryHighlights.module.css';

const CATEGORIES = [
    { icon: <LayoutGrid size={28} />, name: 'ทั้งหมด', count: 120 },
    { icon: <BookOpen size={28} />, name: 'หนังสือเรียน', count: 48 },
    { icon: <Shirt size={28} />, name: 'เสื้อกาวน์', count: 35 },
    { icon: <Shield size={28} />, name: 'อาร์ม', count: 62 },
    { icon: <Gift size={28} />, name: 'ของที่ระลึก', count: 21 },
];

interface CategoryHighlightsProps {
    onCategorySelect: (name: string) => void;
}

export default function CategoryHighlights({ onCategorySelect }: CategoryHighlightsProps) {
    return (
        <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} ThaiFont`}>หมวดหมู่สินค้า</h2>
            <div className={styles.grid}>
                {CATEGORIES.map((cat, i) => (
                    <button
                        key={i}
                        className={styles.card}
                        onClick={() => onCategorySelect(cat.name)}
                    >
                        <div className={styles.iconWrap}>{cat.icon}</div>
                        <span className={`${styles.catName} ThaiFont`}>{cat.name}</span>
                        <span className={`${styles.catCount} ThaiFont`}>{cat.count} รายการ</span>
                    </button>
                ))}
            </div>
        </section>
    );
}

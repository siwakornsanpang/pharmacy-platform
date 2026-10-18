"use client";

import type { CSSProperties } from "react";
import Link from 'next/link';
import styles from './PopularCategories.module.css';
import SectionHeader from '@/components/ui/SectionHeader';
import type { AcademyCategory } from '@/lib/academy';

export default function PopularCategories({ categories }: { categories: AcademyCategory[] }) {
    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <SectionHeader title="หมวดหมู่ยอดนิยม" viewAllHref="/learning/categories" viewAllText="ดูทั้งหมด" />

                <div className={styles.grid}>
                    {categories.map(cat => (
                        <Link 
                            key={cat.id} 
                            href={`/learning/courses?category=${encodeURIComponent(cat.name)}`}
                            className={styles.card} 
                            style={{ '--hover-color': cat.color || '#737300' } as CSSProperties}
                        >
                            <div className={styles.imageWrapper}>
                                <div className={styles.imageInner}>
                                    <img src={cat.imageUrl || `https://placehold.co/100x100?text=${encodeURIComponent(cat.name)}`} alt={cat.name} className={styles.catImage} />
                                </div>
                            </div>
                            <h3 className={styles.catTitle}>{cat.name}</h3>
                            <p className={styles.catCount}>{cat.courseCount} คอร์สเรียน</p>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}

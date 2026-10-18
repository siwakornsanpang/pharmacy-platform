"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LearningBanner from "@/components/member/learning/LearningBanner";
import styles from "../learning.module.css";
import cardStyles from "@/components/member/learning/PopularCategories.module.css";
import { getAcademyCategories, type AcademyCategory } from "@/lib/academy";

export default function AcademyCategoriesPage() {
    const [categories, setCategories] = useState<AcademyCategory[]>([]);

    useEffect(() => {
        getAcademyCategories().then(setCategories).catch(() => setCategories([]));
    }, []);

    return (
        <div>
            <LearningBanner />
            <section className={cardStyles.section}>
                <div className={styles.container}>
                    <h1 className={cardStyles.catTitle} style={{ fontSize: "2rem", marginBottom: "1.5rem" }}>หมวดหมู่ทั้งหมด</h1>
                    <div className={cardStyles.grid}>
                        {categories.map((cat) => (
                            <Link key={cat.id} href={`/learning/courses?category=${encodeURIComponent(cat.name)}`} className={cardStyles.card}>
                                <h3 className={cardStyles.catTitle}>{cat.name}</h3>
                                <p className={cardStyles.catCount}>{cat.courseCount} คอร์สเรียน</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}

"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import styles from "./courses.module.css";
import LearningBanner from "@/components/member/learning/LearningBanner";
import CourseCard from "@/components/member/learning/courses/CourseCard";
import CourseFilters from "@/components/member/learning/courses/CourseFilters";
import { getAcademyCategories, getAcademyCourses, type AcademyCourse } from "@/lib/academy";

function CoursesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
    const [categories, setCategories] = useState<string[]>(["ทั้งหมด"]);
    const [courses, setCourses] = useState<AcademyCourse[]>([]);

    useEffect(() => {
        const catParam = searchParams.get("category");
        if (catParam) setSelectedCategory(catParam);
    }, [searchParams]);

    useEffect(() => {
        getAcademyCategories()
            .then((rows) => setCategories(["ทั้งหมด", ...rows.map((row) => row.name)]))
            .catch(() => undefined);
    }, []);

    useEffect(() => {
        getAcademyCourses({
            category: selectedCategory === "ทั้งหมด" ? undefined : selectedCategory,
            q: searchTerm.trim() || undefined,
        }).then(setCourses).catch(() => setCourses([]));
    }, [selectedCategory, searchTerm]);

    return (
        <div className={styles.page}>
            <LearningBanner onBack={() => router.back()} />
            <section className={styles.searchSection}>
                <div className={styles.container}>
                    <CourseFilters
                        categories={categories}
                        selectedCategory={selectedCategory}
                        searchTerm={searchTerm}
                        onCategoryChange={setSelectedCategory}
                        onSearchChange={setSearchTerm}
                    />
                </div>
            </section>
            <section className={styles.coursesSection}>
                <div className={styles.container}>
                    <div className={styles.resultsBar}>
                        <div className={styles.resultsCount}>
                            พบทั้งหมด <span>{courses.length}</span> รายการ
                        </div>
                    </div>
                    {courses.length > 0 ? (
                        <div className={styles.grid}>
                            {courses.map((course) => (
                                <CourseCard
                                    key={course.id}
                                    id={course.id}
                                    title={course.title}
                                    category={course.categoryName || "ทั่วไป"}
                                    duration={course.durationLabel || "—"}
                                    cpe={course.cpeLabel}
                                    image={course.coverUrl || ""}
                                    color={course.categoryColor || "#737300"}
                                    format={course.format}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <Search size={60} color="#e2e8f0" strokeWidth={1.5} />
                            <h3 className={styles.emptyTitle}>ไม่พบคอร์สที่ต้องการ</h3>
                            <p className={styles.emptySubtitle}>ลองเปลี่ยนคำค้นหาหรือหมวดหมู่ใหม่อีกครั้ง</p>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

export default function CoursesPage() {
    return (
        <Suspense fallback={<div>กำลังโหลด...</div>}>
            <CoursesContent />
        </Suspense>
    );
}

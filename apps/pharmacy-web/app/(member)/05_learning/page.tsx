"use client";

import { useEffect, useMemo, useState } from "react";
import LearningBanner from "@/components/member/learning/LearningBanner";
import CourseFilters from "@/components/member/learning/courses/CourseFilters";
import PopularCategories from "@/components/member/learning/PopularCategories";
import FeaturedCourse from "@/components/member/learning/FeaturedCourse";
import PopularCourses from "@/components/member/learning/PopularCourses";
import ExperiencedInstructors from "@/components/member/learning/ExperiencedInstructors";
import LearningStats from "@/components/member/learning/LearningStats";
import LearnerReviews from "@/components/member/learning/LearnerReviews";
import styles from "./learning.module.css";
import {
    getAcademyCategories,
    getAcademyCourses,
    getAcademyInstructors,
    getAcademyReviews,
    getAcademyStats,
    type AcademyCategory,
    type AcademyCourse,
    type AcademyInstructor,
    type AcademyReview,
    type AcademyStats,
} from "@/lib/academy";

export default function LearningPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
    const [categories, setCategories] = useState<AcademyCategory[]>([]);
    const [courses, setCourses] = useState<AcademyCourse[]>([]);
    const [featured, setFeatured] = useState<AcademyCourse[]>([]);
    const [instructors, setInstructors] = useState<AcademyInstructor[]>([]);
    const [reviews, setReviews] = useState<AcademyReview[]>([]);
    const [stats, setStats] = useState<AcademyStats>({ courseCount: 0, learnerCount: 0, instructorCount: 0 });
    const [error, setError] = useState("");

    useEffect(() => {
        Promise.all([
            getAcademyCategories(),
            getAcademyCourses(),
            getAcademyCourses({ featured: true }),
            getAcademyInstructors(),
            getAcademyReviews(),
            getAcademyStats(),
        ]).then(([nextCategories, nextCourses, nextFeatured, nextInstructors, nextReviews, nextStats]) => {
            setCategories(nextCategories);
            setCourses(nextCourses);
            setFeatured(nextFeatured);
            setInstructors(nextInstructors);
            setReviews(nextReviews);
            setStats(nextStats);
        }).catch(() => setError("โหลดข้อมูล Academy ไม่สำเร็จ"));
    }, []);

    const categoryNames = useMemo(() => ["ทั้งหมด", ...categories.map((item) => item.name)], [categories]);
    const visibleCourses = courses.filter((course) => {
        const matchesCategory = selectedCategory === "ทั้งหมด" || course.categoryName === selectedCategory;
        const matchesSearch = course.title.toLowerCase().includes(searchTerm.trim().toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className={styles.page}>
            <LearningBanner />
            <div className={styles.container} style={{ marginTop: "3rem", marginBottom: "4rem" }}>
                <CourseFilters
                    categories={categoryNames}
                    selectedCategory={selectedCategory}
                    searchTerm={searchTerm}
                    onCategoryChange={setSelectedCategory}
                    onSearchChange={setSearchTerm}
                />
                {error && <p style={{ marginTop: "1rem", color: "#9b3b3b" }}>{error}</p>}
                <p style={{ marginTop: "1rem" }}><a href="/learning/mine">คอร์สของฉัน</a></p>
            </div>
            <PopularCategories categories={categories} />
            <FeaturedCourse courses={featured} />
            <ExperiencedInstructors instructors={instructors} />
            <LearningStats courseCount={stats.courseCount} learnerCount={stats.learnerCount} instructorCount={stats.instructorCount} />
            <PopularCourses courses={visibleCourses} />
            <LearnerReviews reviews={reviews} />
        </div>
    );
}

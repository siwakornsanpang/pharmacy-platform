"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Check, Star } from 'lucide-react';
import styles from './FeaturedCourse.module.css';
import SectionHeader from '@/components/ui/SectionHeader';
import type { AcademyCourse } from '@/lib/academy';

export default function FeaturedCourse({ courses }: { courses: AcademyCourse[] }) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const handlePrev = () => {
        if (courses.length === 0) return;
        setCurrentIndex((prev) => (prev === 0 ? courses.length - 1 : prev - 1));
    };

    const handleNext = () => {
        if (courses.length === 0) return;
        setCurrentIndex((prev) => (prev === courses.length - 1 ? 0 : prev + 1));
    };

    if (courses.length === 0) return null;
    const course = courses[currentIndex] ?? courses[0];

    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <SectionHeader 
                    title="คอร์สเรียนแนะนำ" 
                    viewAllHref="/learning/courses" 
                    viewAllText="ดูทั้งหมด"
                />

                <div className={styles.cardWrapper}>
                    <div className={styles.card}>
                        {/* Navigation Buttons inside Card */}
                        <button onClick={handlePrev} className={`${styles.navBtn} ${styles.prevBtn}`}>
                            <ChevronLeft size={24} />
                        </button>
                        <button onClick={handleNext} className={`${styles.navBtn} ${styles.nextBtn}`}>
                            <ChevronRight size={24} />
                        </button>
                        <div className={styles.imageSide}>
                            {course.coverUrl ? (
                                <Image src={course.coverUrl} alt={course.title} fill className={styles.image} priority />
                            ) : (
                                <div className={styles.image} />
                            )}
                        </div>
                        
                        <div className={styles.contentSide}>
                            <div className={styles.topInfo}>
                                <h2 className={styles.title}>{course.title}</h2>
                                <p className={styles.description}>{course.summary}</p>
                            </div>

                            <div className={styles.outcomesSection}>
                                <h4 className={styles.subTitle}>สิ่งที่จะได้เรียนรู้</h4>
                                <ul className={styles.outcomesList}>
                                    {course.outcomes.map((item, idx) => (
                                        <li key={idx} className={styles.outcomeItem}>
                                            <Check size={16} className={styles.checkIcon} />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <Link href={`/learning/${course.id}`} className={styles.enrollBtn}>เข้าสู่บทเรียน</Link>

                            <div className={styles.footer}>
                                <div className={styles.footerItem}>
                                    <span className={styles.footerLabel}>ผู้สอน</span>
                                    <span className={styles.footerValue}>{course.instructorName || '—'}</span>
                                </div>
                                <div className={styles.footerItem}>
                                    <span className={styles.footerLabel}>ผู้เข้าเรียน</span>
                                    <span className={styles.footerValue}>{course.studentCount} คน</span>
                                </div>
                                <div className={styles.footerItem}>
                                    <span className={styles.footerLabel}>คะแนนรีวิว</span>
                                    <div className={styles.ratingBox}>
                                        <div className={styles.stars}>
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} size={14} fill={course.rating != null && i < Math.round(course.rating) ? "#f6c23e" : "transparent"} color="#f6c23e" />
                                            ))}
                                        </div>
                                        <span className={styles.footerValue}>{course.rating ?? '—'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

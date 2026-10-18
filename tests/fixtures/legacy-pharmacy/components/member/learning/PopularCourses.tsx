"use client";

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Clock, Award } from 'lucide-react';
import styles from './PopularCourses.module.css';
import SectionHeader from '@/components/ui/SectionHeader';
import type { AcademyCourse } from '@/lib/academy';

export default function PopularCourses({ courses }: { courses: AcademyCourse[] }) {
    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <SectionHeader
                    title="คอร์สเรียนยอดนิยม"
                    viewAllHref="/learning/courses"
                    viewAllText="ดูทั้งหมด"
                />

                <div className={styles.grid}>
                    {courses.map((course) => (
                        <Link href={`/learning/${course.id}`} key={course.id} className={styles.card}>
                            <div className={styles.imageWrapper}>
                                {course.coverUrl ? (
                                    <Image src={course.coverUrl} alt={course.title} fill className={styles.image} />
                                ) : (
                                    <div className={styles.image} />
                                )}
                                <div
                                    className={styles.badge}
                                    style={{ backgroundColor: course.categoryColor || '#737300' }}
                                >
                                    {course.categoryName || 'ทั่วไป'}
                                </div>
                            </div>
                            <div className={styles.content}>
                                <h3 className={styles.title}>{course.title}</h3>
                                <p>{course.format === "onsite" ? "ออนไซต์" : "ออนไลน์"}</p>
                                <div className={styles.meta}>
                                    <div className={styles.metaItem}>
                                        <Clock size={16} />
                                        <span>{course.durationLabel || '—'}</span>
                                    </div>
                                    <div className={styles.metaItem}>
                                        <Award size={16} />
                                        <span>{course.cpeLabel}</span>
                                    </div>
                                </div>
                                <div className={styles.footer}>
                                    <div className={styles.enrollBtn}>
                                        <span>เข้าสู่บทเรียน</span>
                                        <ArrowRight size={16} className={styles.arrow} />
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}

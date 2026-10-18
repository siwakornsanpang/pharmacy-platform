"use client";

import React from 'react';
import Image from 'next/image';
import styles from './ExperiencedInstructors.module.css';
import SectionHeader from '@/components/ui/SectionHeader';
import type { AcademyInstructor } from '@/lib/academy';

export default function ExperiencedInstructors({ instructors }: { instructors: AcademyInstructor[] }) {
    return (
        <section className={styles.section}>
            <div className={styles.container}>
                <SectionHeader 
                    title="วิทยากรผู้เชี่ยวชาญ" 
                    viewAllHref="/learning/instructors" 
                    viewAllText="ดูทั้งหมด"
                />
                
                <p className={styles.subtitle}>เรียนรู้จากประสบการณ์จริงของเภสัชกรและคณาจารย์ผู้ทรงคุณวุฒิในสายวิชาชีพ</p>

                <div className={styles.grid}>
                    {instructors.map((instructor) => (
                        <div key={instructor.id} className={styles.card}>
                            <div className={styles.imageWrapper}>
                                {instructor.imageUrl ? (
                                    <Image src={instructor.imageUrl} alt={instructor.name} fill className={styles.image} />
                                ) : (
                                    <div className={styles.image} />
                                )}
                            </div>
                            <div className={styles.info}>
                                <h3 className={styles.name}>{instructor.name}</h3>
                                <p className={styles.title}>{instructor.title}</p>
                                <span className={styles.expertise}>{instructor.expertise}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

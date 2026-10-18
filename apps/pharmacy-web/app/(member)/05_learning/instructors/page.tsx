"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import LearningBanner from "@/components/member/learning/LearningBanner";
import styles from "@/components/member/learning/ExperiencedInstructors.module.css";
import { getAcademyInstructors, type AcademyInstructor } from "@/lib/academy";

export default function AcademyInstructorsPage() {
    const [instructors, setInstructors] = useState<AcademyInstructor[]>([]);

    useEffect(() => {
        getAcademyInstructors().then(setInstructors).catch(() => setInstructors([]));
    }, []);

    return (
        <div>
            <LearningBanner />
            <section className={styles.section}>
                <div className={styles.container}>
                    <h1 style={{ fontSize: "2rem", marginBottom: "1.5rem" }}>วิทยากรทั้งหมด</h1>
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
        </div>
    );
}

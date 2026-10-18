'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock, Award, ArrowRight } from 'lucide-react';
import styles from './CourseCard.module.css';

interface CourseCardProps {
    id: number;
    title: string;
    category: string;
    duration: string;
    cpe: string;
    image: string;
    color: string;
    format?: "online" | "onsite";
}

export default function CourseCard({ id, title, category, duration, cpe, image, color, format = "online" }: CourseCardProps) {
    return (
        <Link href={`/learning/${id}`} className={styles.card}>
            <div className={styles.imageWrapper}>
                {image ? (
                    <Image src={image} alt={title} fill className={styles.image} />
                ) : (
                    <div className={styles.image} />
                )}
                <div className={styles.badge} style={{ backgroundColor: color }}>
                    {category}
                </div>
            </div>
            <div className={styles.content}>
                <h3 className={styles.title}>{title}</h3>
                <p>{format === "onsite" ? "ออนไซต์" : "ออนไลน์"}</p>
                <div className={styles.meta}>
                    <div className={styles.metaItem}>
                        <Clock size={16} />
                        <span>{duration}</span>
                    </div>
                    <div className={styles.metaItem}>
                        <Award size={16} />
                        <span>{cpe}</span>
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
    );
}

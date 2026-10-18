"use client";

import { ChevronLeft } from 'lucide-react';
import styles from "./LearningBanner.module.css";

interface LearningBannerProps {
    onBack?: () => void;
}

export default function LearningBanner({ onBack }: LearningBannerProps) {
    return (
        <div className={styles.banner}>
            <div className={styles.bannerOverlay}>
                {onBack && (
                    <button onClick={onBack} className={styles.backBtn}>
                        <ChevronLeft size={20} />
                        <span>กลับสู่หน้าหลัก</span>
                    </button>
                )}
                <div className={styles.bannerContent}>
                    <h1 className={`${styles.bannerTitle} ThaiFont`}>Pharmacy Academy</h1>
                    <p className={`${styles.bannerSubtitle} ThaiFont`}>
                        ยกระดับทักษะและวิชาชีพเภสัชกรรม ด้วยคอร์สเรียนออนไลน์ที่หลากหลายและทันสมัย
                    </p>
                </div>
            </div>
        </div>
    );
}

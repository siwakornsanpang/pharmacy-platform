"use client";

import styles from "./ProfileComponents.module.css";

export default function ProfileBanner() {
    return (
        <header className={styles.banner}>
            <div className={styles.bannerOverlay}>
                <div className={styles.bannerContent}>
                    <h1 className={`${styles.bannerTitle} ThaiFont`}>ข้อมูลของฉัน</h1>
                    <p className={`${styles.bannerSubtitle} ThaiFont`}>
                        ภาพรวมข้อมูลสถานะของเภสัชกร
                    </p>
                </div>
            </div>
        </header>
    );
}

"use client";

import React from 'react';
import styles from './CareersBanner.module.css';

export default function CareersBanner() {
    return (
        <div className={styles.banner}>
            <div className={styles.bannerOverlay}>
                <div className={styles.bannerContent}>
                    <h1 className={`${styles.bannerTitle} ThaiFont`}>การสมัครงาน</h1>
                    <p className={`${styles.bannerSubtitle} ThaiFont`}>
                        ค้นพบโอกาสทางอาชีพใหม่ๆ ในสายงานเภสัชกรรม จากองค์กรชั้นนำทั่วประเทศ
                    </p>
                </div>
            </div>
        </div>
    );
}

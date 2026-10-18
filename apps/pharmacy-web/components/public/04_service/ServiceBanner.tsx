"use client";

import React from 'react';
import styles from "./ServiceBanner.module.css";

export default function ServiceBanner() {
  return (
    <div className={styles.banner}>
      <div className={styles.bannerOverlay}>
        <div className={styles.bannerContent}>
          <h1 className={`${styles.bannerTitle} ThaiFont`}>งานบริการ</h1>
          <p className={`${styles.bannerSubtitle} ThaiFont`}>
            งานบริการสำหรับประชาชนและผู้ประกอบวิชาชีพเภสัชกรรม
          </p>
        </div>
      </div>
    </div>
  );
}

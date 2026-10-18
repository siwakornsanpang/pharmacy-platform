"use client";

import React from 'react';
import styles from './StoreBanner.module.css';

export default function StoreBanner() {
    return (
        <div className={styles.banner}>
            <div className={styles.bannerOverlay}>
                <div className={styles.bannerContent}>
                    <h1 className={`${styles.bannerTitle} ThaiFont`}>สินค้าสภาเภสัชกรรม</h1>
                    <p className={`${styles.bannerSubtitle} ThaiFont`}>
                        อุปกรณ์ ตำรา และสินค้าคุณภาพสำหรับเภสัชกรมืออาชีพ จัดส่งทั่วประเทศ
                    </p>
                </div>
            </div>
        </div>
    );
}

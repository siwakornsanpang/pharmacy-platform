"use client";

import React from 'react';
import { Package, Truck, ShieldCheck, Award } from 'lucide-react';
import styles from './StoreFeatures.module.css';

const FEATURES = [
    {
        icon: <Package size={28} />,
        title: 'สินค้าคุณภาพ',
        desc: 'คัดสรรจากแบรนด์ชั้นนำ ได้มาตรฐาน อย.',
    },
    {
        icon: <Truck size={28} />,
        title: 'จัดส่งทั่วประเทศ',
        desc: 'จัดส่งฟรีเมื่อสั่งซื้อขั้นต่ำ 1,500 บาท',
    },
    {
        icon: <ShieldCheck size={28} />,
        title: 'รับประกันสินค้า',
        desc: 'เปลี่ยน-คืนสินค้าได้ภายใน 30 วัน',
    },
    {
        icon: <Award size={28} />,
        title: 'สิทธิพิเศษสมาชิก',
        desc: 'ส่วนลดสูงสุด 20% สำหรับสมาชิกสภาเภสัชกรรม',
    },
];

export default function StoreFeatures() {
    return (
        <section className={styles.section}>
            <div className={styles.grid}>
                {FEATURES.map((f, i) => (
                    <div key={i} className={styles.card}>
                        <div className={styles.iconWrap}>{f.icon}</div>
                        <h3 className={`${styles.title} ThaiFont`}>{f.title}</h3>
                        <p className={`${styles.desc} ThaiFont`}>{f.desc}</p>
                    </div>
                ))}
            </div>
        </section>
    );
}

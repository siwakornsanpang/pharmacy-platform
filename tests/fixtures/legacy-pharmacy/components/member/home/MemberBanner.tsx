"use client";

import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import styles from "./MemberBanner.module.css";

export default function MemberBanner() {
  const { isLoggedIn } = useAuth();

  if (!isLoggedIn) return null;

  return (
    <section className={`${styles.memberSection} ThaiFont`}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>สถานะของฉัน</h2>
          <Link href="/profile" className={styles.manageLink}>
            จัดการข้อมูล <ChevronRight size={16} />
          </Link>
        </div>

        <div className={styles.statusGrid}>
          {/* Card 1: CPE Units */}
          <div className={styles.statusCard}>
            <img
              className={styles.oliveImage}
              alt="Olive"
              src="/images/public/home/olive.png"
            />
            <div className={styles.cardContent}>
              <h3 className={styles.mainValue}>10/10</h3>
              <p className={styles.subLabel}>หน่วยกิตประจำปี 2569</p>
              <p className={styles.metaText}>รอบที่ 2 ปี 2568 - 2573</p>
            </div>
            <div className={styles.checkCircle}>
              <Check size={24} color="white" strokeWidth={3} />
            </div>
            <span className={styles.footerValue}>25/100</span>
          </div>

          {/* Card 2: License Status */}
          <div className={styles.statusCard}>
            <img
              className={styles.oliveImage}
              alt="Olive"
              src="/images/public/home/olive.png"
            />
            <div className={styles.cardContent}>
              
              <h3 className={styles.mainValue}>ปกติ</h3>
              <p className={styles.subLabel}>ใบประกอบวิชาชีพหมดอายุ 04/70</p>
            </div>
            <div className={styles.checkCircle}>
              <Check size={24} color="white" strokeWidth={3} />
            </div>
          </div>

          {/* Card 3: Profile Update */}
          <div className={styles.statusCard}>
            <img
              className={styles.oliveImage}
              alt="Olive"
              src="/images/public/home/olive.png"
            />
            <div className={styles.cardContent}>
              <h3 className={styles.mainValue}>สำเร็จ</h3>
              <p className={styles.subLabel}>อัปเดตข้อมูลประจำปี 2569</p>
            </div>
            <div className={styles.checkCircle}>
              <Check size={24} color="white" strokeWidth={3} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

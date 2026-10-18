"use client";

import { ChevronLeft } from "lucide-react";
import styles from "./MeetingBanner.module.css";

interface MeetingBannerProps {
  onBack?: () => void;
}

export default function MeetingBanner({ onBack }: MeetingBannerProps) {
  return (
    <section className={styles.banner}>
      <div className={styles.bannerOverlay}>
        {onBack && (
          <button onClick={onBack} className={styles.backBtn}>
            <ChevronLeft size={20} />
            <span>กลับสู่หน้าหลัก</span>
          </button>
        )}
        <div className={styles.bannerContent}>
          <h1 className={styles.bannerTitle}>งานประชุม</h1>
          <p className={styles.bannerSubtitle}>
            ติดตามทุกข่าวสารสำคัญของสภาเภสัชกรรม
          </p>
        </div>
      </div>
    </section>
  );
}

"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import PharmacistDetailCard from "@/components/public/01_home/PharmacistDetailCard";
import {
  getPharmacistById,
  getFormattedThaiDateTime,
} from "@/components/public/01_home/licenseSearchShared";
import styles from "@/components/public/01_home/LicenseSearch.module.css";
import pageStyles from "@/components/public/01_home/LicenseSearchResults.module.css";

function LicenseSearchDetailInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = String(params.id || "");
  const item = getPharmacistById(id);

  const backQuery = searchParams.toString();
  const backHref = backQuery
    ? `/license-search?${backQuery}`
    : "/license-search";

  if (!item) {
    return (
      <div className={pageStyles.pageInner}>
        <Link href={backHref} className={pageStyles.backBtn}>
          <ChevronLeft size={18} />
          <span>ย้อนกลับผลการค้นหา</span>
        </Link>
        <div className={styles.emptyCard}>
          <h4 className={styles.emptyTitle}>ไม่พบข้อมูล</h4>
          <p className={styles.emptySubtitle}>
            ไม่พบข้อมูลผู้ประกอบวิชาชีพเภสัชกรรมที่เลือก
          </p>
          <Link href={backHref} className={styles.resetButton}>
            <span>กลับไปผลการค้นหา</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={pageStyles.pageInner}>
      <Link href={backHref} className={pageStyles.backBtn}>
        <ChevronLeft size={18} />
        <span>ย้อนกลับผลการค้นหา</span>
      </Link>

      <div className={styles.resultsContainer}>
        <h3 className={styles.resultTitle}>รายละเอียดผู้ประกอบวิชาชีพ</h3>
        <PharmacistDetailCard
          item={item}
          searchTime={getFormattedThaiDateTime()}
        />
      </div>
    </div>
  );
}

export default function LicenseSearchDetailPage() {
  return (
    <div className={`${pageStyles.pageWrapper} ThaiFont`}>
      <header className={pageStyles.banner}>
        <div className={pageStyles.bannerOverlay}>
          <div className={pageStyles.bannerContent}>
            <h1 className={pageStyles.bannerTitle}>รายละเอียด</h1>
            <p className={pageStyles.bannerSubtitle}>
              ผู้ประกอบวิชาชีพเภสัชกรรม
            </p>
          </div>
        </div>
      </header>

      <div className={pageStyles.container}>
        <Suspense
          fallback={
            <div className={pageStyles.loadingBox}>
              <Loader2 size={28} className={styles.spinner} />
              <span>กำลังโหลด...</span>
            </div>
          }
        >
          <LicenseSearchDetailInner />
        </Suspense>
      </div>
    </div>
  );
}

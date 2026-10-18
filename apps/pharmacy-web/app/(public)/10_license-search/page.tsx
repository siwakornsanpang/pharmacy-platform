import LicenseSearchResults from "@/components/public/01_home/LicenseSearchResults";
import styles from "@/components/public/01_home/LicenseSearchResults.module.css";

export default function LicenseSearchPage() {
  return (
    <div className={`${styles.pageWrapper} ThaiFont`}>
      <header className={styles.banner}>
        <div className={styles.bannerOverlay}>
          <div className={styles.bannerContent}>
            <h1 className={styles.bannerTitle}>ผลการค้นหา</h1>
            <p className={styles.bannerSubtitle}>
              รายชื่อผู้ประกอบวิชาชีพเภสัชกรรม
            </p>
          </div>
        </div>
      </header>

      <div className={styles.container}>
        <LicenseSearchResults />
      </div>
    </div>
  );
}

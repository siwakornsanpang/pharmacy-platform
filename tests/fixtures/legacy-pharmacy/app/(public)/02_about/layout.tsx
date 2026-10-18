import AboutSidebar from "@/components/public/02_about/AboutSidebar";
import styles from "./about.module.css";

export default function AboutLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={styles.pageWrapper}>
            {/* Banner */}
            <header className={styles.banner}>
                <div className={styles.bannerOverlay}>
                    <div className={styles.bannerContent}>
                        <h1 className={styles.bannerTitle}>เกี่ยวกับองค์กร</h1>
                        <p className={styles.bannerSubtitle}>
                            สภาเภสัชกรรม ก่อตั้งขึ้นตามพระราชบัญญัติวิชาชีพเภสัชกรรม พ.ศ. 2537
                        </p>
                    </div>
                </div>
            </header>

            {/* Sidebar + Content */}
            <div className={styles.layoutContainer}>
                <AboutSidebar />
                <main className={styles.contentArea}>
                    {children}
                </main>
            </div>
        </div>
    );
}

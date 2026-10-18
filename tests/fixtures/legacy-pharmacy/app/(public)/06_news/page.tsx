import { getNews } from "@/lib/api";
import NewsContainer from "@/components/public/06_news/NewsContainer";
import Image from "next/image";
import styles from "./news.module.css";

export default async function NewsPage() {
    const allNews = await getNews();

    return (
        <div className={styles.pageWrapper}>
            {/* Banner Section */}
            <header className={styles.banner}>
                <div className={styles.bannerOverlay}>
                    <div className={styles.bannerContent}>
                        <h1 className={styles.bannerTitle}>ข่าวสาร</h1>
                        <p className={styles.bannerSubtitle}>
                            ติดตามทุกข่าวสารสำคัญของสภาเภสัชกรรม
                        </p>
                    </div>
                </div>
            </header>

            <div className={styles.container}>
                <NewsContainer allNews={allNews} />
            </div>
        </div>
    );
}

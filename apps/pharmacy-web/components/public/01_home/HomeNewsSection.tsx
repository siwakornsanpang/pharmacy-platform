"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import FeaturedNews from "@/components/public/06_news/FeaturedNews";
import styles from "./HomeNewsSection.module.css";
import { News, NewsCategory } from "@/features/content/browser-api";

interface HomeNewsSectionProps {
  highlights: News[];
  newsList: News[];
}

const getCategoryLabel = (cat: NewsCategory) => {
  switch (cat) {
    case "news":
      return "ข่าวประชาสัมพันธ์";
    case "recruitment":
      return "ข่าวรับสมัครงานสภา";
    case "procurement":
      return "ข่าวประกาศจัดซื้อจัดจ้าง";
    default:
      return "ข่าวสาร";
  }
};

const getExcerpt = (news: News) => {
  if (news.excerpt?.trim()) return news.excerpt;
  if (!news.content) return "";
  return (
    news.content
      .replace(/<[^>]*>?/gm, "")
      .replace(/&nbsp;/g, " ")
      .trim()
      .substring(0, 180) + (news.content.length > 180 ? "..." : "")
  );
};

const formatNewsDate = (news: News) =>
  new Date(news.publishedAt || news.createdAt || "").toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export default function HomeNewsSection({
  highlights,
  newsList,
}: HomeNewsSectionProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const cards = newsList.slice(0, 6);
  const [active, setActive] = useState(0);

  const onScroll = () => {
    const el = scrollerRef.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (!el || !card) return;
    const step = card.offsetWidth + 12;
    setActive(Math.min(cards.length - 1, Math.round(el.scrollLeft / step)));
  };

  const goTo = (index: number) => {
    const el = scrollerRef.current;
    const card = el?.children[index] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
  };

  return (
    <section className={styles.section}>
      <div className={styles.bgDecoration}>
        <svg
          viewBox="0 0 1440 800"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="homeNewsWave1" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#eef0e4" />
              <stop offset="100%" stopColor="#e0e3cc" />
            </linearGradient>
            <linearGradient id="homeNewsWave2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e5e8d1" />
              <stop offset="100%" stopColor="#d3d7b4" />
            </linearGradient>
            <linearGradient id="homeNewsWave3" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d8dbae" />
              <stop offset="100%" stopColor="#c5c99b" />
            </linearGradient>
          </defs>
          <path
            d="M1440,100 C1000,400 400,600 0,650 L0,800 L1440,800 Z"
            fill="url(#homeNewsWave1)"
          />
          <path
            d="M1440,350 C900,550 400,700 0,730 L0,800 L1440,800 Z"
            fill="url(#homeNewsWave2)"
          />
          <path
            d="M1440,600 C1000,700 500,780 0,780 L0,800 L1440,800 Z"
            fill="url(#homeNewsWave3)"
          />
        </svg>
      </div>

      <div className={styles.container}>
        <div className={styles.featuredSlot}>
          {highlights.length > 0 ? (
            <FeaturedNews news={highlights} showViewAll />
          ) : (
            <div className={styles.emptyState}>ไม่พบข้อมูลเรื่องเด่น</div>
          )}
        </div>

        <div className={styles.newsListSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>ข่าวสาร</h2>
            <Link href="/news" className={styles.viewAll}>
              ดูทั้งหมด
              <ArrowRight size={18} strokeWidth={2} />
            </Link>
          </div>

          {cards.length > 0 ? (
            <div className={styles.newsGrid} ref={scrollerRef} onScroll={onScroll}>
              {cards.map((news) => (
                <Link
                  href={`/news/${news.id}`}
                  key={news.id}
                  className={styles.newsCard}
                  style={{ textDecoration: "none" }}
                >
                  <div className={styles.newsImageWrapper}>
                    {news.thumbnailUrl ? (
                      <Image
                        src={news.thumbnailUrl}
                        alt={news.title}
                        fill
                        className={styles.newsImage}
                      />
                    ) : (
                      <div
                        className={styles.newsImage}
                        style={{ background: "#e5e7eb" }}
                      />
                    )}
                    <span className={styles.badgeOverImage}>
                      {getCategoryLabel(news.category)}
                    </span>
                  </div>
                  <div className={styles.newsCardContent}>
                    <h3 className={styles.newsCardTitle}>{news.title}</h3>
                    <div className={styles.newsMeta}>
                      <time className={styles.newsDate}>{formatNewsDate(news)}</time>
                      <p className={styles.newsCardDesc}>{getExcerpt(news)}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>ไม่พบข้อมูลข่าวสาร</div>
          )}
          {cards.length > 1 && (
            <div className={styles.newsDots}>
              {cards.map((news, index) => (
                <button
                  key={news.id}
                  type="button"
                  className={`${styles.newsDot} ${index === active ? styles.newsDotActive : ""}`}
                  onClick={() => goTo(index)}
                  aria-label={`ไปข่าวที่ ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

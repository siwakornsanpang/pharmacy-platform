"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "@/components/public/01_home/HomeNewsSection.module.css";
import { News, NewsCategory } from "@/lib/api";

interface MemberHighlightSectionProps {
  highlights: News[];
}

const getCategoryLabel = (cat: NewsCategory) => {
  switch (cat) {
    case 'news': return 'ข่าวประชาสัมพันธ์';
    case 'recruitment': return 'ข่าวรับสมัครงานสภา';
    case 'procurement': return 'ข่าวประกาศจัดซื้อจัดจ้าง';
    default: return 'ข่าวสาร';
  }
};

const getExcerpt = (news: News) => {
  if (news.excerpt?.trim()) return news.excerpt;
  if (!news.content) return "";
  return news.content
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
    .substring(0, 180) + (news.content.length > 180 ? "..." : "");
};

export default function MemberHighlightSection({ highlights }: MemberHighlightSectionProps) {
  const [activeSlide, setActiveSlide] = useState(0);

  const handlePrev = () => {
    if (highlights.length === 0) return;
    setActiveSlide((prev) => (prev === 0 ? highlights.length - 1 : prev - 1));
  };

  const handleNext = () => {
    if (highlights.length === 0) return;
    setActiveSlide((prev) => (prev === highlights.length - 1 ? 0 : prev + 1));
  };

  const activeHighlight = highlights.length > 0 ? highlights[activeSlide] : null;

  return (
    <section className={styles.section}>
      <div className={styles.bgDecoration}>
        <svg viewBox="0 0 1440 800" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id="wave1" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#eef0e4" />
              <stop offset="100%" stopColor="#e0e3cc" />
            </linearGradient>
            <linearGradient id="wave2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#e5e8d1" />
              <stop offset="100%" stopColor="#d3d7b4" />
            </linearGradient>
            <linearGradient id="wave3" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#d8dbae" />
              <stop offset="100%" stopColor="#c5c99b" />
            </linearGradient>
          </defs>
          <path d="M1440,100 C1000,400 400,600 0,650 L0,800 L1440,800 Z" fill="url(#wave1)" />
          <path d="M1440,350 C900,550 400,700 0,730 L0,800 L1440,800 Z" fill="url(#wave2)" />
          <path d="M1440,600 C1000,700 500,780 0,780 L0,800 L1440,800 Z" fill="url(#wave3)" />
        </svg>
      </div>

      <div className={styles.container}>
        <div className={styles.highlightWrapper}>
          <div className={styles.highlightHeader}>
            <h2 className={styles.sectionTitle}>เรื่องเด่น</h2>
            <div className={styles.highlightNav}>
              <button onClick={handlePrev} className={styles.navButton} aria-label="Previous">
                <ChevronLeft size={20} strokeWidth={2} />
              </button>
              <button onClick={handleNext} className={styles.navButton} aria-label="Next">
                <ChevronRight size={20} strokeWidth={2} />
              </button>
            </div>
          </div>

          {activeHighlight && (
            <>
              <div className={styles.highlightCard}>
                <div className={styles.highlightImageWrapper}>
                  {activeHighlight.thumbnailUrl ? (
                    <Image
                      src={activeHighlight.thumbnailUrl}
                      alt={activeHighlight.title}
                      fill
                      className={styles.highlightImage}
                    />
                  ) : (
                    <div className={styles.highlightImage} style={{ background: '#e5e7eb' }} />
                  )}
                </div>
                <div className={styles.highlightContent}>
                  <span className={styles.badge}>
                    {getCategoryLabel(activeHighlight.category)}
                  </span>
                  <h3 className={styles.highlightTitle}>{activeHighlight.title}</h3>
                  <p className={styles.highlightDesc}>{getExcerpt(activeHighlight)}</p>
                  <Link href={`/news/${activeHighlight.id}`} className={styles.readMoreBtn}>
                    อ่านเพิ่มเติม
                  </Link>
                </div>
              </div>

              {highlights.length > 1 && (
                <div className={styles.dotsContainer}>
                  {highlights.map((_, index) => (
                    <div
                      key={index}
                      onClick={() => setActiveSlide(index)}
                      className={`${styles.dot} ${index === activeSlide ? styles.dotActive : ""}`}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {!activeHighlight && (
             <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
               ไม่พบข้อมูลเรื่องเด่น
             </div>
          )}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import styles from "./PharmacyCarousel.module.css";
import DotPagination from "@/components/ui/DotPagination";
import Container from "@/components/ui/Container";

interface SlideData {
  title: string;
  desc: string;
  image: string;
}

const slides: SlideData[] = [
  {
    title: "เภสัชกรโรงพยาบาล",
    desc: "จัดการระบบยาในโรงพยาบาล ตรวจสอบใบสั่งยา\nและให้คำปรึกษาแก่ทีมสหสาขาวิชาชีพ",
    image: "/images/public/home/image2.png",
  },
  {
    title: "เภสัชกรชุมชน",
    desc: "ดูแลสุขภาพประชาชนในร้านยา\nให้คำปรึกษาด้านยาและสุขภาพเบื้องต้น",
    image: "/images/public/home/image1.png",
  },
  
  {
    title: "เภสัชกรอุตสาหการ",
    desc: "ผู้เชี่ยวชาญด้านกระบวนการผลิต การควบคุมคุณภาพ\nและการพัฒนาตำหรับยาในโรงงานอุตสาหกรรม",
    image: "/images/public/home/image3.png",
  },
  {
    title: "เภสัชกรคุ้มครองผู้บริโภค",
    desc: "เฝ้าระวังความปลอดภัยด้านยาคุ้มครองผู้บริโภค\gเพื่อให้ประชาชนปลอดภัยดูแลและคัดกรองสุขภาพประชาชนในร้านยา",
    image: "/images/public/home/image4.png",
  },
  {
    title: "เภสัชกรการตลาด",
    desc: "ให้ข้อมูลผลิตภัณฑ์ยาแก่บุคลากรทางการแพทย์\nวางแผนกลยุทธ์การตลาดยาอย่างมีจริยธรรม",
    image: "/images/public/home/image5.png",
  },
  {
    title: "เภสัชกรวิจัยและพัฒนา",
    desc: "วิจัยและพัฒนายาใหม่ ทดสอบทางคลินิก\nเพื่อสร้างนวัตกรรมทางเภสัชกรรม",
    image: "/images/public/home/image6.png",
  },
];

function getPositionClass(offset: number): string {
  switch (offset) {
    case 0:
      return styles.cardActive;
    case -1:
      return styles.cardLeft1;
    case -2:
      return styles.cardLeft2;
    case 1:
      return styles.cardRight1;
    case 2:
      return styles.cardRight2;
    default:
      return styles.cardHidden;
  }
}

export default function PharmacyCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const goTo = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  const goPrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  const goNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % slides.length);
  }, []);

  // Auto-play logic with progress reset
  useEffect(() => {
    if (!isPaused) {
      timerRef.current = setInterval(goNext, 5000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, goNext, activeIndex]); // Added activeIndex to reset timer on manual click

  return (
    <section className={styles.section}>
      <Container size="2xl" className={styles.sectionInner}>
        {/* Header */}
        <div className={styles.headerGroup}>
          <h2 className={styles.sectionTitle}>สายงานวิชาชีพเภสัชกร</h2>
          <p className={styles.sectionSubtitle}>
            วิชาชีพเภสัชกรมีความหลากหลายในการ<br className={styles.subtitleBreak} />
            ปฏิบัติงานเพื่อดูแลประชาชนในมิติต่าง ๆ
          </p>
        </div>

        {/* Carousel */}
        <div 
          className={styles.carouselWrapper}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className={styles.carouselTrack}>
            {slides.map((slide, i) => {
              let offset = i - activeIndex;
              if (offset > slides.length / 2) offset -= slides.length;
              if (offset < -slides.length / 2) offset += slides.length;

              const positionClass = getPositionClass(offset);

              return (
                <div
                  key={i}
                  className={`${styles.card} ${positionClass}`}
                  onClick={() => goTo(i)}
                >
                  <div className={styles.cardInner}>
                    <div className={styles.cardShine} />
                    <Image
                      src={slide.image}
                      alt={slide.title}
                      width={340}
                      height={420}
                      className={styles.slideImage}
                      unoptimized={true}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Controls Section */}
        <div className={styles.bottomSection}>
          <button
            className={styles.navBtn}
            onClick={goPrev}
            aria-label="Previous slide"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <div className={styles.slideContent} key={activeIndex}>
            <h3 className={styles.slideTitle}>{slides[activeIndex].title}</h3>
            <p className={styles.slideDesc}>{slides[activeIndex].desc}</p>
          </div>

          <button
            className={styles.navBtn}
            onClick={goNext}
            aria-label="Next slide"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        <div className={styles.pagination}>
          <DotPagination
            total={slides.length}
            active={activeIndex}
            onClick={goTo}
          />
        </div>
      </Container>
    </section>
  );
}

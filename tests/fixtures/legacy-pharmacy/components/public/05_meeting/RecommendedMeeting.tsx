"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, Calendar, Users, ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./RecommendedMeeting.module.css";
import { FaGraduationCap } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

export interface RecommendedMeetingItem {
  id: number | string;
  title: string;
  location: string;
  date: string;
  count: string;
  image: string;
  cpe?: string;
}

export default function RecommendedMeeting({ meetings }: { meetings?: RecommendedMeetingItem[] }) {
  const recommendedMeetings = meetings ?? [];
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered || recommendedMeetings.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev === recommendedMeetings.length - 1 ? 0 : prev + 1));
    }, 5000); // auto slide every 5 seconds

    return () => clearInterval(timer);
  }, [isHovered, recommendedMeetings.length]);

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? recommendedMeetings.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === recommendedMeetings.length - 1 ? 0 : prev + 1));
  };

  const current = recommendedMeetings[activeIndex];
  if (!current) return null;
  const isFull = current.count.includes("เต็ม");

  return (
    <section className={styles.recommendSection}>
      <div className={styles.sectionHeader}>
        <h2 className="ThaiFont">งานประชุมแนะนำ</h2>
        <div className={styles.sliderButtons}>
          <button className={styles.sliderBtn} onClick={handlePrev} aria-label="ก่อนหน้า">
            <ChevronLeft size={20} />
          </button>
          <button className={styles.sliderBtn} onClick={handleNext} aria-label="ถัดไป">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div 
        className={styles.sliderWrapper}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Left Card Arrow */}
        <button className={`${styles.cardArrow} ${styles.cardArrowLeft}`} onClick={handlePrev} aria-label="ก่อนหน้า">
          <ChevronLeft size={24} />
        </button>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -15 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className={styles.recommendCard}
            onClick={() => router.push(`/meeting/${current.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && router.push(`/meeting/${current.id}`)}
            aria-label={`ดูรายละเอียด: ${current.title}`}
          >
            <img src={current.image} className={styles.recommendImage} alt={current.title} />
            <div className={styles.recommendContent}>
              <div className={styles.titleWrapper}>
                <h3 className="ThaiFont">{current.title}</h3>
                {current.cpe && (
                  <div className={styles.cpeBadge}>
                    <FaGraduationCap className={styles.cpeIcon} />
                    <span>CPE {current.cpe} หน่วยกิต</span>
                  </div>
                )}
              </div>

              <div className={styles.infoItem}>
                <MapPin size={20} className={styles.grayIcon} />
                <p className="ThaiFont">สถานที่ : {current.location}</p>
              </div>

              <div className={styles.infoItem}>
                <Calendar size={20} className={styles.grayIcon} />
                <p className="ThaiFont">วันที่จัดประชุม : {current.date}</p>
              </div>

              <div className={styles.recommendFooter}>
                <div className={styles.participantsInfo}>
                  <div className={styles.infoItem}>
                    <Users size={20} className={styles.grayIcon} />
                    <span className="ThaiFont" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      รับสมัคร :
                      <span className={isFull ? styles.countFull : styles.countAvailable}>
                        {current.count}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Right Card Arrow */}
        <button className={`${styles.cardArrow} ${styles.cardArrowRight}`} onClick={handleNext} aria-label="ถัดไป">
          <ChevronRight size={24} />
        </button>
      </div>

      <div className={styles.sliderIndicators}>
        {recommendedMeetings.map((_, index) => (
          <span
            key={index}
            className={`${styles.dot} ${activeIndex === index ? styles.active : ""}`}
            onClick={() => setActiveIndex(index)}
            style={{ cursor: "pointer" }}
            role="button"
            aria-label={`ไปที่สไลด์ ${index + 1}`}
          ></span>
        ))}
      </div>
    </section>
  );
}

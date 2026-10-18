"use client";

import { useEffect, useState, useRef } from "react";
import styles from "./HomeStats.module.css";
import { getPharmacistTotal } from "@/features/registry/browser-api";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
}

function AnimatedNumber({ value, duration = 2000 }: AnimatedNumberProps) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const startTimeRef = useRef<number | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const elementRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasStarted(true);
        } else {
          // Reset when scrolling away
          setHasStarted(false);
          setCount(0);
          startTimeRef.current = null;
          countRef.current = 0;
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasStarted) return;

    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      
      // Easing function: easeOutExpo
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      
      const currentCount = Math.floor(easeProgress * value);
      
      if (currentCount !== countRef.current) {
        countRef.current = currentCount;
        setCount(currentCount);
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value, duration, hasStarted]);

  return (
    <span ref={elementRef}>
      {count.toLocaleString()}
    </span>
  );
}

export default function HomeStats() {
  const [pharmacistsCount, setPharmacistsCount] = useState(53099);
  const [qualityPharmacies] = useState(3601);
  const [faculties] = useState(25);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setPharmacistsCount(await getPharmacistTotal());
      } catch (err) {
        console.error("Error fetching pharmacists count:", err);
      }
    };

    fetchStats();
  }, []);

  return (
    <section className={styles.statsSection}>
      <div className={styles.statsContainer}>
        <div className={styles.statsGrid}>
          {/* Stat Item 1 */}
          <div className={styles.statItem}>
            <h3 className={styles.statNumber}>
              <AnimatedNumber value={pharmacistsCount} />
            </h3>
            <p className={styles.statLabel}>เภสัชกร</p>
          </div>

          {/* Stat Item 2 */}
          <div className={styles.statItem}>
            <h3 className={styles.statNumber}>
              <AnimatedNumber value={qualityPharmacies} />
            </h3>
            <p className={styles.statLabel}>ร้านยาคุณภาพ</p>
          </div>

          {/* Stat Item 3 */}
          <div className={styles.statItem}>
            <h3 className={styles.statNumber}>
              <AnimatedNumber value={faculties} />
            </h3>
            <p className={styles.statLabel}>
              คณะเภสัชศาสตร์<br className={styles.labelBreak} />ประเทศไทย
            </p>
          </div>
        </div>
        <div className={styles.updateTimeContainer}>
          อัพเดทข้อมูล ณ วันที่ 14 มิถุนายน 2569 เวลา 13:00 น.
        </div>
      </div>
    </section>
  );
}

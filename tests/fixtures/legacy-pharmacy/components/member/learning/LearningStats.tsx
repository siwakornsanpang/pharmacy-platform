"use client";

import { useEffect, useState, useRef } from "react";
import styles from "./LearningStats.module.css";

interface AnimatedNumberProps {
  value: number;
  duration?: number;
  suffix?: string;
}

function AnimatedNumber({ value, duration = 2000, suffix = "" }: AnimatedNumberProps) {
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
      {count.toLocaleString()}{suffix}
    </span>
  );
}

export default function LearningStats({ courseCount, learnerCount, instructorCount }: { courseCount: number; learnerCount: number; instructorCount: number }) {
  const stats = [
    { label: "คอร์สเรียนออนไลน์", value: courseCount, suffix: "" },
    { label: "สมาชิกเข้าเรียน", value: learnerCount, suffix: "" },
    { label: "วิทยากรผู้เชี่ยวชาญ", value: instructorCount, suffix: "" },
  ];

  return (
    <section className={styles.statsSection}>
      <div className={styles.statsContainer}>
        <div className={styles.statsGrid}>
          {stats.map((stat, index) => (
            <div key={index} className={styles.statItem}>
              <div className={styles.statIconWrapper}>
                <div className={styles.statIconGlow} />
                <h3 className={styles.statNumber}>
                  <AnimatedNumber value={stat.value} suffix={stat.suffix} />
                  <div className={styles.numberShine} />
                </h3>
              </div>
              <p className={styles.statLabel}>{stat.label}</p>
            </div>
          ))}
        </div>
        <div className={styles.updateTimeContainer}>
          จำนวนนับจากข้อมูลที่เผยแพร่ในระบบ Academy
        </div>
      </div>
    </section>
  );
}

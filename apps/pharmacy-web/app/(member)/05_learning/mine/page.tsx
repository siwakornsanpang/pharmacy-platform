"use client";

import { useEffect, useState } from "react";
import LearningBanner from "@/components/member/learning/LearningBanner";
import styles from "../learning.module.css";
import { listEnrollments } from "@/features/academy/api";
import { academyErrorMessage, type AcademyEnrollment } from "@/features/academy/mapping";

export default function MyAcademyCoursesPage() {
  const [items, setItems] = useState<AcademyEnrollment[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    listEnrollments(controller.signal).then(setItems).catch((error) => {
      if (controller.signal.aborted) return;
      setMessage(academyErrorMessage(error, "โหลดคอร์สของฉันไม่สำเร็จ"));
    });
    return () => controller.abort();
  }, []);

  return (
    <div>
      <LearningBanner />
      <section className={styles.container} style={{ padding: "2rem 0 4rem" }}>
        <h1>คอร์สของฉัน</h1>
        {message && <p>{message}</p>}
        {items.length === 0 && !message && <p>ยังไม่ได้ลงทะเบียนคอร์ส</p>}
        <ul>
          {items.map((item) => (
            <li key={item.courseId}>
              <a href={item.status === "active" ? `/learning/${item.courseId}/learn` : `/learning/${item.courseId}`}>
                {item.title}
              </a>
              {" "}
              {item.status === "cancelled" ? "ยกเลิกแล้ว" : `ความคืบหน้า ${item.progressPercent}%`}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

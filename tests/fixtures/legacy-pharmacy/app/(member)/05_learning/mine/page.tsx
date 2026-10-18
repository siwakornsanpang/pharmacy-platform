"use client";

import { useEffect, useState } from "react";
import LearningBanner from "@/components/member/learning/LearningBanner";
import styles from "../learning.module.css";

type Enrollment = {
  courseId: number;
  title: string;
  status: string;
  progressPercent: number;
};

export default function MyAcademyCoursesPage() {
  const [items, setItems] = useState<Enrollment[]>([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/academy/enrollments").then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || "โหลดคอร์สของฉันไม่สำเร็จ");
        return;
      }
      setItems(data);
    });
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

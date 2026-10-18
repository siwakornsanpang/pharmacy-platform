"use client";

import { useAuth } from "@/context/AuthContext";
import styles from "./PublicServices.module.css";

const publicServices = [
  
  {
    id: 1,
    img: "/images/public/service/service2.jpg",
    title: "ร้องเรียนจรรยาบรรณ",
    description: "แจ้งปัญหาการให้บริการไม่เหมาะสม",
    href: "https://law.pharmacycouncil.org/complaint",
  },
  {
    id: 2,
    img: "/images/public/service/service4.jpg",
    title: "ตรวจสอบคำร้อง",
    description: "ตรวจสอบคำร้องเรียน",
    href: "https://law.pharmacycouncil.org/tracking",
  },
  {
    id: 3,
    img: "/images/public/service/service3.jpg",
    title: "แจ้งเบาะแสร้านยาแขวนป้าย",
    description: "รายงานร้านยาที่ไม่อาจปฏิบัติตามมาตรฐาน",
    href: "https://law.pharmacycouncil.org/tip-report",
  },
  {
    id: 4,
    img: "/images/public/service/service1.jpg",
    title: "โครงการสำหรับประชาชน",
    description: "กิจกรรมและบริการเพื่อสุขภาพ\nสำหรับทุกคน",
    href: "/service/people-project",
  },
  {
    id: 5,
    img: "/images/public/service/service5.jpg",
    title: "ร้านยาใกล้ฉัน",
    description: "ค้นหาร้านยาใกล้คุณ",
    href: "https://law.pharmacycouncil.org/",
  },
  {
    id: 6,
    img: "/images/public/service/service6.jpg",
    title: "เภสัชกรทางไกล",
    description: "ปรึกษาเภสัชกรออนไลน์",
    href: "#",
  },
];

export default function PublicServices() {
  const { isLoggedIn } = useAuth();

  if (isLoggedIn) return null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionCon}>
        <h2 className={`${styles.title} ThaiFont`}>บริการประชาชน</h2>
        <div className={styles.cardGrid}>
          {publicServices.map((service) => (
            <a
              href={service.href}
              key={service.id}
              className={styles.card}
              target={service.href?.startsWith("http") ? "_blank" : "_self"}
              rel="noopener noreferrer"
            >
              <img
                src={service.img}
                alt={service.title}
                className={styles.serviceImage}
              />
              <div className={styles.cardOverlay}>
                <h3 className={`${styles.cardTitle} ThaiFont`}>{service.title}</h3>
                <p className={`${styles.cardDescription} ThaiFont`}>
                  {service.description}
                </p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

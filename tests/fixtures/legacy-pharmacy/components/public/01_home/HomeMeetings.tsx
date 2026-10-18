"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { MapPin, Calendar, Users, Building2 } from "lucide-react";
import styles from "./HomeMeetings.module.css";
import { FaGraduationCap } from "react-icons/fa";
import Container from "@/components/ui/Container";
import SectionHeader from "@/components/ui/SectionHeader";
import Badge from "@/components/ui/Badge";

const MOCK_MEETINGS = [
  {
    id: 1,
    day: "2",
    month: "พ.ค.",
    title: "สภาเภสัชกรรมเปิดอบรมหลักสูตรรอบรมระยะสั้นการบริบาลทางเภสัชกรรม (สาขาปฐมภูมิ) รุ่นที่ 5",
    location: "ห้อง Sapphire 204-206 ศูนย์การประชุม อิมแพ็ค ฟอรั่ม เมืองทองธานี จังหวัดนนทบุรี",
    dateRange: "02 พ.ค. 2569 - 13 ก.ย. 2569",
    audiences: ["บุคคลทั่วไป", "เภสัชกร"],
    capacity: "100 คน",
    agency: "ราชวิทยาลัย",
    image: "/images/public/home/image1.png",
    cpe: "10.0",
  },
  {
    id: 2,
    day: "1",
    month: "มี.ค.",
    title: "Pharmacy Research and Innovation Summit 2025: (PRIS2025) Synergizing for the better future",
    location: "ห้อง Sapphire 204-206 ศูนย์การประชุม อิมแพ็ค ฟอรั่ม เมืองทองธานี จังหวัดนนทบุรี",
    dateRange: "02 พ.ค. 2569 - 13 ก.ย. 2569",
    audiences: ["เภสัชกร"],
    capacity: "100 คน",
    agency: "ราชวิทยาลัย",
    image: "/images/public/home/image2.png",
    cpe: "5.5",
  },
  {
    id: 3,
    day: "13",
    month: "ก.พ.",
    title: "การฝึกอบรม ประกาศนียบัตรวิชาชีพเภสัชกรรม (สาขาบริหารจัดการผลิตภัณฑ์สมุนไพร) รุ่นที่ 3",
    location: "ห้อง Sapphire 204-206 ศูนย์การประชุม อิมแพ็ค ฟอรั่ม เมืองทองธานี จังหวัดนนทบุรี",
    dateRange: "02 พ.ค. 2569 - 13 ก.ย. 2569",
    audiences: ["บุคคลทั่วไป"],
    capacity: "เต็ม",
    agency: "ราชวิทยาลัย",
    image: "/images/public/home/image3.png",
    cpe: "3.0",
  },
];

export default function HomeMeetings() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const onScroll = () => {
    const el = scrollerRef.current;
    const card = el?.firstElementChild as HTMLElement | null;
    if (!el || !card) return;
    const step = card.offsetWidth + 12;
    setActive(Math.min(MOCK_MEETINGS.length - 1, Math.round(el.scrollLeft / step)));
  };

  const goTo = (index: number) => {
    const el = scrollerRef.current;
    const card = el?.children[index] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft, behavior: "smooth" });
  };

  return (
    <section className={styles.section}>
      <Container size="2xl" className={styles.mobileBleed}>
        <div className={styles.headerWrap}>
          <SectionHeader title="การประชุม" viewAllHref="/meeting" />
        </div>

        <div className={styles.meetingList} ref={scrollerRef} onScroll={onScroll}>
          {MOCK_MEETINGS.map((meeting) => (
            <div key={meeting.id} className={styles.meetingCard}>
              {/* Date Box */}
              <div className={styles.dateBox}>
                <span className={styles.dateDay}>{meeting.day}</span>
                <span className={styles.dateMonth}>{meeting.month}</span>
              </div>

              {/* Meeting Content */}
              <div className={styles.meetingContent}>
                <div className={styles.titleWrapper}>
                  <h3 className={styles.meetingTitle}>{meeting.title}</h3>
                  {meeting.cpe && meeting.audiences.includes("เภสัชกร") && (
                    <div className={styles.cpeBadge}>
                      <FaGraduationCap className={styles.cpeIcon} />
                      <span>CPE {meeting.cpe}<span className={styles.cpeUnit}> หน่วยกิต</span></span>
                    </div>
                  )}
                </div>
                <div className={styles.meetingDetails}>
                  <div className={styles.detailRow}>
                    <div className={styles.detailIcon}><MapPin size={16} /></div>
                    <span><span className={styles.fieldLabel}>สถานที่ : </span>{meeting.location}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <div className={styles.detailIcon}><Calendar size={16} /></div>
                    <span><span className={styles.fieldLabel}>วันที่จัดประชุม : </span>{meeting.dateRange}</span>
                  </div>
                  <div className={styles.detailRowFlex}>
                    <div className={styles.audiencesWrapper}>
                      <div className={styles.detailIcon}><Users size={16} /></div>
                      <span className={styles.participantLabel}>ผู้เข้าร่วม :</span>
                      <div className={styles.badges}>
                        {meeting.audiences.includes("บุคคลทั่วไป") && (
                          <Badge>บุคคลทั่วไป</Badge>
                        )}
                        {meeting.audiences.includes("เภสัชกร") && (
                          <Badge active>เภสัชกร</Badge>
                        )}
                      </div>
                    </div>
                    <span className={styles.capacity}>
                      <Users size={14} className={styles.capacityIcon} />
                      <span className={styles.fieldLabel}>จำนวน : </span>
                      {meeting.capacity}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <div className={styles.detailIcon}><Building2 size={16} /></div>
                    <span>หน่วยงาน : {meeting.agency}</span>
                  </div>
                </div>
              </div>

              {/* Meeting Image */}
              <div className={styles.meetingImageWrapper}>
                <Image
                  unoptimized={true}
                  src={meeting.image}
                  alt={meeting.title}
                  width={280}
                  height={180}
                  className={styles.meetingImage}
                />
              </div>
            </div>
          ))}
        </div>
        <div className={styles.dots}>
          {MOCK_MEETINGS.map((meeting, index) => (
            <button
              key={meeting.id}
              type="button"
              className={`${styles.dot} ${index === active ? styles.dotActive : ""}`}
              onClick={() => goTo(index)}
              aria-label={`ไปการประชุมที่ ${index + 1}`}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}

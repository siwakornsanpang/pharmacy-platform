"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import styles from "./MeetingList.module.css";
import { FaGraduationCap } from "react-icons/fa";
import { HiOutlineLocationMarker, HiOutlineCalendar, HiOutlineUsers } from "react-icons/hi";

export interface StaticMeeting {
  id: number | string;
  day: string;
  month: string;
  title: string;
  location: string;
  date: string;
  tags: string[];
  count: string;
  image: string;
  status?: string;
  cpe?: string;
  category?: string;
  attendees?: string;
}

interface MeetingListProps {
  meetings: StaticMeeting[];
  searchTerm?: string;
  onSearchChange?: (val: string) => void;
}

export default function MeetingList({ meetings, searchTerm = "", onSearchChange }: MeetingListProps) {
  const router = useRouter();
  const [internalSearch, setInternalSearch] = useState("");

  // Support both controlled (parent manages search) and uncontrolled mode
  const activeSearch = onSearchChange !== undefined ? searchTerm : internalSearch;
  const handleSearchChange = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setInternalSearch(val);
    }
  };

  const filteredMeetings = meetings.filter((item) =>
    item.title.toLowerCase().includes(activeSearch.toLowerCase())
  );

  return (
    <section className={styles.meetingList}>
      <div className={styles.listContainer}>
        {filteredMeetings.length > 0 ? (
          filteredMeetings.map((item) => (
            <div
              key={item.id}
              className={`${styles.meetingItem} ${item.status === "past" ? styles.pastItem : ""}`}
              onClick={() => router.push(`/meeting/${item.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && router.push(`/meeting/${item.id}`)}
              aria-label={`ดูรายละเอียด: ${item.title}`}
            >
              <div className={styles.dateBox}>
                <div className={styles.day}>{item.day}</div>
                <div className={styles.month}>{item.month}</div>
              </div>

              <div className={styles.meetingInfo}>
                <div className={styles.titleWrapper}>
                  <h3 className="ThaiFont">{item.title}</h3>
                </div>
                {item.cpe && item.tags.includes("เภสัชกร") && (
                  <div className={styles.cpeBadge}>
                    <FaGraduationCap className={styles.cpeIcon} />
                    <span>CPE {item.cpe} หน่วยกิต</span>
                  </div>
                )}

                <div className={styles.infoItem}>
                  <HiOutlineLocationMarker size={18} className={styles.grayIcon} />
                  <p className="ThaiFont">สถานที่ : {item.location}</p>
                </div>

                <div className={styles.infoItem}>
                  <HiOutlineCalendar size={18} className={styles.grayIcon} />
                  <p className="ThaiFont">วันที่จัดประชุม : {item.date}</p>
                </div>

                <div className={styles.participantsRow}>
                  <div className={styles.infoItem}>
                    <HiOutlineUsers size={18} className={styles.grayIcon} />
                    <span className="ThaiFont" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      รับสมัคร :
                      <span className={item.count.includes("เต็ม") ? styles.countFull : styles.countAvailable}>
                        {item.count}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <img src={item.image} className={styles.meetingImage} alt={item.title} />
            </div>
          ))
        ) : (
          <div className={styles.noResults}>
            <Search size={48} strokeWidth={1.5} className={styles.noResultsIcon} />
            <p className="ThaiFont">ไม่พบงานประชุมที่ค้นหา</p>
          </div>
        )}
      </div>
    </section>
  );
}

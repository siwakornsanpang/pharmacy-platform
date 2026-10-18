"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import MeetingBanner from "@/components/public/05_meeting/MeetingBanner";
import MeetingList, { type StaticMeeting } from "@/components/public/05_meeting/MeetingList";
import MeetingPagination from "@/components/public/05_meeting/MeetingPagination";
import RecommendedMeeting, { type RecommendedMeetingItem } from "@/components/public/05_meeting/RecommendedMeeting";
import { conferenceAssetUrl, getPublicEvents } from "@/lib/conference/api";
import type { PublicEventCard } from "@/lib/conference/types";
import styles from "./meeting.module.css";

const PAGE_SIZE = 4;
const thaiDate = (value: string) => new Date(value).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
const countText = (event: PublicEventCard) => event.availability.capacity == null ? "ไม่จำกัดจำนวน" : `${event.availability.registered}/${event.availability.capacity}${event.availability.status === "full" ? " (เต็ม)" : " คน"}`;

function mapEvent(event: PublicEventCard): StaticMeeting {
  const start = new Date(event.startAt);
  return {
    id: event.id, day: String(start.getDate()), month: start.toLocaleDateString("th-TH", { month: "short" }), title: event.nameTh,
    location: event.locationName || "จะแจ้งให้ทราบภายหลัง", date: `${thaiDate(event.startAt)} - ${thaiDate(event.endAt)}`,
    tags: event.eligibleCategories.map((item) => item.nameTh), count: countText(event), image: conferenceAssetUrl(event.thumbnailImageUrl),
    cpe: event.cpeCredits, status: event.lifecycleStatus === "past" ? "past" : undefined,
  };
}
const mapRecommended = (event: PublicEventCard): RecommendedMeetingItem => ({ id: event.id, title: event.nameTh, location: event.locationName || "จะแจ้งให้ทราบภายหลัง", date: `${thaiDate(event.startAt)} - ${thaiDate(event.endAt)}`, count: countText(event), image: conferenceAssetUrl(event.thumbnailImageUrl), cpe: event.cpeCredits });

export default function PublicMeetingPage() {
  const [inputValue, setInputValue] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [meetings, setMeetings] = useState<StaticMeeting[]>([]);
  const [recommended, setRecommended] = useState<RecommendedMeetingItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true); setError("");
      try {
        const [list, nearest] = await Promise.all([
          getPublicEvents({ page, pageSize: PAGE_SIZE, search: searchTerm }),
          searchTerm ? Promise.resolve(null) : getPublicEvents({ page: 1, pageSize: 1, scope: "upcoming", sort: "soonest" }),
        ]);
        if (!active) return;
        setMeetings(list.data.map(mapEvent)); setTotalPages(Math.max(list.pagination.totalPages, 1)); setRecommended(nearest?.data.map(mapRecommended) ?? []);
      } catch { if (active) setError("ไม่สามารถโหลดข้อมูลงานประชุมได้"); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [page, searchTerm, reload]);

  const submit = () => { setPage(1); setSearchTerm(inputValue.trim()); };
  return <div className={styles.pageWrapper}>
    <MeetingBanner />
    <div className={styles.container}>
      <div className={styles.searchSection}>
        <div className={styles.searchHeader}><h2 className={styles.searchTitle}>ค้นหาการประชุม</h2><span className={styles.searchSubtitle}>งานประชุมและอบรมสัมมนา</span></div>
        <div className={styles.searchRow}>
          <div className={styles.inputWrap}><Search size={18} className={styles.inputIcon} /><input className={`${styles.input} ThaiFont`} placeholder="ค้นหาชื่องานประชุม..." value={inputValue} onChange={(event) => setInputValue(event.target.value)} onKeyDown={(event) => event.key === "Enter" && submit()} /></div>
          <button type="button" className={`${styles.searchButton} ThaiFont`} onClick={submit}>ค้นหา</button>
        </div>
      </div>
      {!searchTerm && <RecommendedMeeting meetings={recommended} />}
      {loading ? <p className="ThaiFont">กำลังโหลดงานประชุม...</p> : error ? <div><p className="ThaiFont">{error}</p><button type="button" onClick={() => setReload((value) => value + 1)}>ลองใหม่</button></div> : <MeetingList meetings={meetings} />}
      {!loading && !error && <MeetingPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
    </div>
  </div>;
}

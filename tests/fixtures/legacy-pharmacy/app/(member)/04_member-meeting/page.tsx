"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import MeetingBanner from "@/components/public/05_meeting/MeetingBanner";
import MeetingList, { type StaticMeeting } from "@/components/public/05_meeting/MeetingList";
import MeetingPagination from "@/components/public/05_meeting/MeetingPagination";
import { conferenceAssetUrl, getMemberEvents } from "@/lib/conference/api";
import type { MemberEventCard } from "@/lib/conference/types";
import { ensureConferenceSession } from "@/lib/conference/session";
import styles from "./meeting.module.css";

const PAGE_SIZE = 4;
const thaiDate = (value: string) => new Date(value).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
function mapEvent(event: MemberEventCard): StaticMeeting {
  const start = new Date(event.startAt); const capacity = event.availability.capacity;
  return { id: event.id, day: String(start.getDate()), month: start.toLocaleDateString("th-TH", { month: "short" }), title: event.nameTh,
    location: event.locationName || "จะแจ้งให้ทราบภายหลัง", date: `${thaiDate(event.startAt)} - ${thaiDate(event.endAt)}`,
    tags: event.eligibleCategories.map((item) => item.nameTh), count: capacity == null ? "ไม่จำกัดจำนวน" : `${event.availability.registered}/${capacity}${event.eligibility.status === "full" ? " (เต็ม)" : " คน"}`,
    image: conferenceAssetUrl(event.thumbnailImageUrl), cpe: event.cpeCredits, status: event.lifecycleStatus === "past" ? "past" : undefined };
}

export default function MemberMeetingPage() {
  const [search, setSearch] = useState(""); const [page, setPage] = useState(1); const [meetings, setMeetings] = useState<StaticMeeting[]>([]);
  const [pages, setPages] = useState(1); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [reload, setReload] = useState(0);
  useEffect(() => { let active = true;
    async function load() { setLoading(true); setError(""); try { await ensureConferenceSession(); const result = await getMemberEvents({ page, pageSize: PAGE_SIZE, search });
      if (active) { setMeetings(result.data.map(mapEvent)); setPages(Math.max(result.pagination.totalPages, 1)); }
    } catch { if (active) setError("ไม่สามารถตรวจสอบสิทธิ์งานประชุมได้ กรุณาลองใหม่"); } finally { if (active) setLoading(false); } }
    void load(); return () => { active = false; }; }, [page, search, reload]);
  return <div className={styles.pageWrapper}><MeetingBanner /><div className={styles.container}>
    <div className={styles.searchSection}><div className={styles.searchInputWrapper}><Search size={20} className={styles.searchIcon} /><input className={`${styles.searchInput} ThaiFont`} placeholder="ค้นหาตามชื่อการประชุม..." value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} /></div></div>
    {loading ? <p className="ThaiFont">กำลังตรวจสอบงานประชุมสำหรับเภสัชกร...</p> : error ? <div><p className="ThaiFont">{error}</p><button type="button" onClick={() => setReload((value) => value + 1)}>ลองใหม่</button></div> : <MeetingList meetings={meetings} />}
    {!loading && !error && <MeetingPagination currentPage={page} totalPages={pages} onPageChange={setPage} />}
  </div></div>;
}

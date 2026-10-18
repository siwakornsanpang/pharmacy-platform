"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { Check, Star } from "lucide-react";
import LearningBanner from "@/components/member/learning/LearningBanner";
import styles from "@/components/member/learning/FeaturedCourse.module.css";
import { formatTraining, getAcademyCourse, type AcademyCourseDetail } from "@/lib/academy";

export default function AcademyCourseDetailPage() {
    const params = useParams<{ id: string }>();
    const [course, setCourse] = useState<AcademyCourseDetail | null>(null);
    const [missing, setMissing] = useState(false);
    const [state, setState] = useState<{ enrolled: boolean; progressPercent?: number; orderStatus?: string | null } | null>(null);
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        getAcademyCourse(params.id).then(setCourse).catch(() => setMissing(true));
        fetch(`/api/academy/courses/${params.id}`).then(async (res) => {
            if (res.ok) setState(await res.json());
        });
    }, [params.id]);

    const enroll = async () => {
        setBusy(true);
        setMessage("");
        const res = await fetch(`/api/academy/courses/${params.id}/enroll`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) {
            setMessage(data.message || "ลงทะเบียนไม่สำเร็จ");
            return;
        }
        window.location.href = `/learning/${params.id}/learn`;
    };

    const cancel = async () => {
        setBusy(true);
        setMessage("");
        const res = await fetch(`/api/academy/courses/${params.id}/cancel`, { method: "POST" });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) {
            setMessage(data.message || "ยกเลิกไม่สำเร็จ");
            return;
        }
        setState({ enrolled: false, progressPercent: 0, orderStatus: state?.orderStatus });
    };

    const pay = async () => {
        setBusy(true);
        setMessage("");
        const res = await fetch(`/api/academy/courses/${params.id}/order`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{}",
        });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) {
            setMessage(data.message || "ชำระเงินจำลองไม่สำเร็จ");
            return;
        }
        window.location.href = `/learning/${params.id}/learn`;
    };

    const refund = async () => {
        setBusy(true);
        setMessage("");
        const res = await fetch(`/api/academy/courses/${params.id}/refund`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reason: "จำลองการคืนเงิน" }),
        });
        const data = await res.json().catch(() => ({}));
        setBusy(false);
        if (!res.ok) {
            setMessage(data.message || "คืนเงินจำลองไม่สำเร็จ");
            return;
        }
        setState({ enrolled: false, progressPercent: 0, orderStatus: "refunded" });
        setMessage("คืนเงินจำลองแล้ว สามารถชำระใหม่อีกครั้ง");
    };

    return (
        <div>
            <LearningBanner />
            <section className={styles.section}>
                <div className={styles.container}>
                    {missing && <p>ไม่พบคอร์สนี้ หรือคอร์สยังไม่ถูกเผยแพร่</p>}
                    {course && (
                        <div className={styles.card}>
                            <div className={styles.imageSide}>
                                {course.coverUrl ? (
                                    <Image src={course.coverUrl} alt={course.title} fill className={styles.image} />
                                ) : (
                                    <div className={styles.image} />
                                )}
                            </div>
                            <div className={styles.contentSide}>
                                <h1 className={styles.title}>{course.title}</h1>
                                <p className={styles.description}>{course.summary}</p>
                                <h2 className={styles.subTitle}>สิ่งที่จะได้เรียนรู้</h2>
                                <ul className={styles.outcomesList}>
                                    {course.outcomes.map((item) => (
                                        <li key={item} className={styles.outcomeItem}>
                                            <Check size={16} className={styles.checkIcon} />
                                            <span>{item}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className={styles.footer}>
                                    <div className={styles.footerItem}>
                                        <span className={styles.footerLabel}>ผู้สอน</span>
                                        <span className={styles.footerValue}>{course.instructorName || "—"}</span>
                                    </div>
                                    <div className={styles.footerItem}>
                                        <span className={styles.footerLabel}>ระยะเวลา</span>
                                        <span className={styles.footerValue}>{course.durationLabel || "—"}</span>
                                    </div>
                                    <div className={styles.footerItem}>
                                        <span className={styles.footerLabel}>CPE</span>
                                        <span className={styles.footerValue}>{course.cpeLabel}</span>
                                    </div>
                                    <div className={styles.footerItem}>
                                        <span className={styles.footerLabel}>คะแนน</span>
                                        <span className={styles.footerValue}>
                                            <Star size={14} fill="#f6c23e" color="#f6c23e" /> {course.rating ?? "—"}
                                        </span>
                                    </div>
                                </div>
                                <p className={styles.description}>{course.format === "onsite" ? "ออนไซต์" : "ออนไลน์"}</p>
                                {course.format === "onsite" && (
                                    <>
                                        <p className={styles.description}>สถานที่ {course.venue || "—"}</p>
                                        <p className={styles.description}>วันอบรม {formatTraining(course.trainingStartsAt, course.trainingEndsAt) || "—"}</p>
                                    </>
                                )}
                                <p className={styles.description}>
                                    {Number(course.price) > 0
                                        ? `ราคา ${Number(course.price).toLocaleString()} บาท · การชำระเป็นแบบจำลอง ไม่มีการตัดเงินจริง`
                                        : "เรียนฟรี"}
                                </p>
                                {(course.lessons?.length ?? 0) > 0 && (
                                    <>
                                        <h2 className={styles.subTitle}>บทเรียน</h2>
                                        <ul className={styles.outcomesList}>
                                            {course.lessons.map((lesson, index) => (
                                                <li key={lesson.id} className={styles.outcomeItem}>
                                                    <span>{index + 1}. {lesson.title}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                                {state?.enrolled ? (
                                    <>
                                        <a className={styles.enrollBtn} href={`/learning/${course.id}/learn`}>เข้าเรียน</a>
                                        {Number(state.progressPercent) >= 100 && (
                                            <a className={styles.enrollBtn} href={`/learning/${course.id}/certificate`}>ใบประกาศ</a>
                                        )}
                                        {Number(state.progressPercent) < 100 && Number(course.price) === 0 && (
                                            <button className={styles.enrollBtn} type="button" disabled={busy} onClick={cancel}>ยกเลิกการลงทะเบียน</button>
                                        )}
                                        {Number(state.progressPercent) < 100 && Number(course.price) > 0 && (
                                            <button className={styles.enrollBtn} type="button" disabled={busy} onClick={refund}>คืนเงินจำลอง</button>
                                        )}
                                    </>
                                ) : Number(course.price) > 0 ? (
                                    <button className={styles.enrollBtn} type="button" disabled={busy} onClick={pay}>
                                        {busy ? "กำลังจำลองการชำระ" : "ชำระเงินจำลอง"}
                                    </button>
                                ) : (
                                    <button className={styles.enrollBtn} type="button" disabled={busy} onClick={enroll}>
                                        {busy ? "กำลังลงทะเบียน" : "ลงทะเบียนเรียน"}
                                    </button>
                                )}
                                {message && <p className={styles.description}>{message}</p>}
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}

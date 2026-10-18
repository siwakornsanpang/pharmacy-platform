"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Check, Star } from "lucide-react";
import LearningBanner from "@/components/member/learning/LearningBanner";
import styles from "@/components/member/learning/FeaturedCourse.module.css";
import { academyCommandKey, cancelEnrollment, enrollFree, getCourse, getLearning, payMock, refundMock } from "@/features/academy/api";
import { academyErrorMessage, formatTraining, type AcademyCourseDetail } from "@/features/academy/mapping";

export default function AcademyCourseDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [course, setCourse] = useState<AcademyCourseDetail | null>(null);
    const [missing, setMissing] = useState(false);
    const [state, setState] = useState<{ enrolled: boolean; progressPercent?: number; orderStatus?: string | null } | null>(null);
    const [message, setMessage] = useState("");
    const [busy, setBusy] = useState(false);
    const refundReason = useRef("จำลองการคืนเงิน");

    useEffect(() => {
        const controller = new AbortController();
        getCourse(params.id, controller.signal).then(setCourse).catch((error) => {
            if (controller.signal.aborted) return;
            setMissing(true);
            setMessage(academyErrorMessage(error, "ไม่พบคอร์สนี้ หรือคอร์สยังไม่ถูกเผยแพร่"));
        });
        getLearning(params.id, controller.signal).then((learning) => {
            setState({ enrolled: learning.enrolled, progressPercent: learning.progressPercent, orderStatus: learning.orderStatus });
        }).catch(() => undefined);
        return () => controller.abort();
    }, [params.id]);

    const run = async (action: () => Promise<unknown>, failed: string, onSuccess: () => void) => {
        setBusy(true);
        setMessage("");
        try {
            await action();
            onSuccess();
        } catch (error) {
            setMessage(academyErrorMessage(error, failed));
        } finally {
            setBusy(false);
        }
    };

    const enroll = () => run(() => enrollFree(params.id), "ลงทะเบียนไม่สำเร็จ", () => router.push(`/learning/${params.id}/learn`));
    const cancel = () => run(() => cancelEnrollment(params.id), "ยกเลิกไม่สำเร็จ", () => {
        setState({ enrolled: false, progressPercent: 0, orderStatus: state?.orderStatus });
    });
    const pay = () => run(() => payMock(params.id, academyCommandKey("pay", params.id)), "ชำระเงินจำลองไม่สำเร็จ", () => {
        router.push(`/learning/${params.id}/learn`);
    });
    const refund = () => {
        const reason = refundReason.current;
        return run(() => refundMock(params.id, reason, academyCommandKey("refund", `${params.id}:${reason}`)), "คืนเงินจำลองไม่สำเร็จ", () => {
            setState({ enrolled: false, progressPercent: 0, orderStatus: "refunded" });
            setMessage("คืนเงินจำลองแล้ว สามารถชำระใหม่อีกครั้ง");
        });
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

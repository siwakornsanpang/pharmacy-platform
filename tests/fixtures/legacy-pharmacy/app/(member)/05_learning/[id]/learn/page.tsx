"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import styles from "./learn.module.css";
import { formatTraining } from "@/lib/academy";

type Quiz = { question: string; options: string[] };
type Lesson = {
  id: number;
  title: string;
  description: string | null;
  videoUrl: string | null;
  completed: boolean;
  documents: { name: string; fileUrl: string }[];
  quiz: Quiz[];
};

function media(url: string) {
  if (!/^https?:\/\//i.test(url)) return null;
  const youtube = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/);
  if (youtube) return { kind: "iframe" as const, src: `https://www.youtube.com/embed/${youtube[1]}` };
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { kind: "iframe" as const, src: `https://player.vimeo.com/video/${vimeo[1]}` };
  if (/\.(mp4|webm)(\?|$)/i.test(url)) return { kind: "video" as const, src: url };
  return { kind: "iframe" as const, src: url };
}

export default function AcademyLearnPage() {
  const params = useParams<{ id: string }>();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [exam, setExam] = useState<Quiz[]>([]);
  const [examPassed, setExamPassed] = useState(false);
  const [place, setPlace] = useState<{ format?: string; venue?: string | null; trainingStartsAt?: string | null; trainingEndsAt?: string | null }>({});
  const [examAnswers, setExamAnswers] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch(`/api/academy/courses/${params.id}`).then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || "โหลดบทเรียนไม่สำเร็จ");
        setReady(true);
        return;
      }
      setEnrolled(Boolean(data.enrolled));
      setProgress(Number(data.progressPercent || 0));
      setLessons(data.lessons || []);
      setExam(data.exam || []);
      setExamPassed(Boolean(data.examPassed));
      setPlace({ format: data.format, venue: data.venue, trainingStartsAt: data.trainingStartsAt, trainingEndsAt: data.trainingEndsAt });
      setReady(true);
    });
  }, [params.id]);

  const lesson = lessons[selected];
  const view = lesson?.videoUrl ? media(lesson.videoUrl) : null;

  const complete = async () => {
    if (!lesson) return;
    setMessage("");
    const res = await fetch(`/api/academy/lessons/${lesson.id}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.message || "บันทึกไม่สำเร็จ");
      return;
    }
    setProgress(Number(data.progressPercent || 0));
    setLessons(lessons.map((item) => item.id === lesson.id ? { ...item, completed: true } : item));
    const next = lessons.map((item) => item.id === lesson.id ? { ...item, completed: true } : item);
    if (next.every((item) => item.completed)) {
      const refreshed = await fetch(`/api/academy/courses/${params.id}`);
      const body = await refreshed.json();
      if (refreshed.ok) setExam(body.exam || []);
    }
  };

  const submitExam = async () => {
    setMessage("");
    const res = await fetch(`/api/academy/courses/${params.id}/exam`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: examAnswers }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.message || "ส่งข้อสอบไม่สำเร็จ");
      return;
    }
    setExamPassed(true);
    setProgress(Number(data.progressPercent || 100));
  };

  if (!ready) return null;
  if (!enrolled) {
    return (
      <div className={styles.wrap}>
        <p>{message || "ลงทะเบียนเรียนก่อนเข้าบทเรียน"}</p>
        <a href={`/learning/${params.id}`}>กลับไปหน้าคอร์ส</a>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <aside className={styles.side}>
        <div className={styles.progress}>ความคืบหน้า {progress}%</div>
        {progress >= 100 && <a href={`/learning/${params.id}/certificate`}>ใบประกาศ</a>}
        {lessons.map((item, index) => (
          <button
            key={item.id}
            className={index === selected ? styles.itemActive : styles.item}
            type="button"
            onClick={() => { setSelected(index); setAnswers([]); setMessage(""); }}
          >
            {item.completed ? "✓ " : ""}{item.title}
          </button>
        ))}
      </aside>
      <section className={styles.player}>
        {place.format === "onsite" && (
          <div>
            <h2>อบรมออนไซต์</h2>
            <p>สถานที่ {place.venue || "—"}</p>
            <p>วันอบรม {formatTraining(place.trainingStartsAt, place.trainingEndsAt) || "—"}</p>
          </div>
        )}
        {lesson && (
          <>
            <h1>{lesson.title}</h1>
            {view?.kind === "iframe" && <iframe className={styles.frame} src={view.src} title={lesson.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />}
            {view?.kind === "video" && <video className={styles.frame} src={view.src} controls />}
            {!view && <p>บทนี้ยังไม่มีวิดีโอ</p>}
            {lesson.description && <p>{lesson.description}</p>}
            {lesson.documents?.map((document) => (
              <a key={document.fileUrl} href={document.fileUrl} target="_blank" rel="noreferrer">{document.name}</a>
            ))}
            {lesson.quiz.length > 0 && (
              <div className={styles.quiz}>
                {lesson.quiz.map((item, index) => (
                  <fieldset key={item.question}>
                    <legend>{item.question}</legend>
                    {item.options.map((option) => (
                      <label key={option}>
                        <input
                          type="radio"
                          name={`q-${index}`}
                          checked={answers[index] === option}
                          onChange={() => setAnswers(lesson.quiz.map((_, optionIndex) => optionIndex === index ? option : (answers[optionIndex] || "")))}
                        />
                        {option}
                      </label>
                    ))}
                  </fieldset>
                ))}
              </div>
            )}
            {lesson.completed ? <p className={styles.done}>เรียนบทนี้จบแล้ว</p> : <button className={styles.complete} type="button" onClick={complete}>บันทึกว่าเรียนจบบทนี้</button>}
          </>
        )}
        {lessons.length === 0 && <p>คอร์สนี้ยังไม่มีบทเรียน</p>}
        {message && <p>{message}</p>}
        {examPassed && <p className={styles.done}>สอบจบคอร์สผ่านแล้ว</p>}
        {!examPassed && exam.length > 0 && (
          <div className={styles.quiz}>
            <h2>ข้อสอบจบคอร์ส</h2>
            {exam.map((item, index) => (
              <fieldset key={item.question}>
                <legend>{item.question}</legend>
                {item.options.map((option) => (
                  <label key={option}>
                    <input
                      type="radio"
                      name={`exam-${index}`}
                      checked={examAnswers[index] === option}
                      onChange={() => setExamAnswers(exam.map((_, optionIndex) => optionIndex === index ? option : (examAnswers[optionIndex] || "")))}
                    />
                    {option}
                  </label>
                ))}
              </fieldset>
            ))}
            <button className={styles.complete} type="button" onClick={submitExam}>ส่งข้อสอบ</button>
          </div>
        )}
      </section>
    </div>
  );
}

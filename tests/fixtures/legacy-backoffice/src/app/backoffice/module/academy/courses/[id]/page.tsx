"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { authFetch } from "@/app/utils/authFetch";
import styles from "../../academy.module.css";

const API = process.env.NEXT_PUBLIC_API_URL;

type Option = { id: number; name: string };

type QuizItem = { question: string; options: { text: string; correct: boolean }[] };

function blankQuiz(): QuizItem {
  return { question: "", options: [{ text: "", correct: true }, { text: "", correct: false }] };
}

function parseQuizText(text: string): QuizItem[] {
  return text.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean).flatMap((block) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const options = lines.slice(1).map((line) => ({
      text: line.replace(/^-\s*/, "").replace(/\*$/, "").trim(),
      correct: line.endsWith("*"),
    })).filter((option) => option.text);
    if (!options.length) return [];
    if (!options.some((option) => option.correct)) options[0].correct = true;
    return [{ question: lines[0], options }];
  });
}

function serializeQuiz(items: QuizItem[]) {
  return items
    .filter((item) => item.question.trim() && item.options.some((option) => option.text.trim()))
    .map((item) => {
      const options = item.options.filter((option) => option.text.trim());
      const marked = options.some((option) => option.correct) ? options : options.map((option, index) => ({ ...option, correct: index === 0 }));
      return [item.question.trim(), ...marked.map((option) => `- ${option.text.trim()}${option.correct ? "*" : ""}`)].join("\n");
    })
    .join("\n\n");
}

function QuizEditor({ name, value, onChange }: { name: string; value: string; onChange: (text: string) => void }) {
  const [items, setItems] = useState<QuizItem[]>(() => parseQuizText(value));
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  useEffect(() => {
    const saved = parseQuizText(value);
    if (saved.length && items.length === 0) setItems(saved);
  }, [value, items.length]);
  const update = (next: QuizItem[], open: number | null = openIndex) => {
    setItems(next);
    setOpenIndex(open);
    onChange(serializeQuiz(next));
  };
  return (
    <div className={styles.quizList}>
      {items.map((item, index) => (
        <div className={styles.lesson} key={`${name}-${index}`}>
          <div className={styles.lessonHead}>
            <button className={styles.fold} type="button" onClick={() => setOpenIndex(openIndex === index ? null : index)}>
              {openIndex === index ? "▴" : "▾"} ข้อที่ {index + 1}{item.question.trim() ? ` · ${item.question.trim()}` : ""}
            </button>
            <button className={styles.danger} type="button" onClick={() => update(items.filter((_, itemIndex) => itemIndex !== index), openIndex === index ? null : openIndex)}>ลบข้อ</button>
          </div>
          {openIndex === index && (
            <>
          <label>คำถาม<input value={item.question} onChange={(event) => update(items.map((question, itemIndex) => itemIndex === index ? { ...question, question: event.target.value } : question))} /></label>
          {item.options.map((option, optionIndex) => (
            <div className={styles.optionRow} key={optionIndex}>
              <input
                type="radio"
                name={`${name}-${index}`}
                checked={option.correct}
                onChange={() => update(items.map((question, itemIndex) => itemIndex === index ? { ...question, options: question.options.map((choice, choiceIndex) => ({ ...choice, correct: choiceIndex === optionIndex })) } : question))}
                aria-label="คำตอบที่ถูก"
              />
              <input
                value={option.text}
                placeholder={`ตัวเลือก ${optionIndex + 1}`}
                onChange={(event) => update(items.map((question, itemIndex) => itemIndex === index ? { ...question, options: question.options.map((choice, choiceIndex) => choiceIndex === optionIndex ? { ...choice, text: event.target.value } : choice) } : question))}
              />
              <button className={styles.ghost} type="button" onClick={() => update(items.map((question, itemIndex) => itemIndex === index ? { ...question, options: question.options.filter((_, choiceIndex) => choiceIndex !== optionIndex) } : question))} disabled={item.options.length <= 2}>ลบ</button>
            </div>
          ))}
          <button className={styles.ghost} type="button" onClick={() => update(items.map((question, itemIndex) => itemIndex === index ? { ...question, options: [...question.options, { text: "", correct: false }] } : question))}>เพิ่มตัวเลือก</button>
            </>
          )}
        </div>
      ))}
      <button className={styles.addBar} type="button" onClick={() => update([...items, blankQuiz()], items.length)}>เพิ่มคำถาม</button>
    </div>
  );
}

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const empty = {
  title: "",
  summary: "",
  coverUrl: "",
  durationLabel: "",
  cpeCredits: "0",
  conferenceCode: "",
  price: "0",
  audience: "all",
  format: "online",
  venue: "",
  trainingStartsAt: "",
  trainingEndsAt: "",
  status: "draft",
  isFeatured: false,
  popularOrder: 0,
  categoryId: "",
  instructorId: "",
  outcomes: "",
  examText: "",
};

export default function AcademyCourseFormPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = params.id === "new";
  const [form, setForm] = useState(empty);
  const [lessons, setLessons] = useState<{ id?: number; title: string; description: string; videoUrl: string; quizText: string; documents: { id?: number; name: string; fileUrl: string }[] }[]>([]);
  const [openLesson, setOpenLesson] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [categories, setCategories] = useState<Option[]>([]);
  const [instructors, setInstructors] = useState<Option[]>([]);

  useEffect(() => {
    authFetch(`${API}/academy/admin/categories`).then(async (res) => {
      if (res.ok) setCategories(await res.json());
    });
    authFetch(`${API}/academy/admin/instructors`).then(async (res) => {
      if (res.ok) setInstructors(await res.json());
    });
    if (isNew) return;
    authFetch(`${API}/academy/admin/courses/${params.id}`).then(async (res) => {
      if (!res.ok) return;
      const data = await res.json();
      setForm({
        title: data.title || "",
        summary: data.summary || "",
        coverUrl: data.coverUrl || "",
        durationLabel: data.durationLabel || "",
        cpeCredits: String(data.cpeCredits ?? "0"),
        conferenceCode: data.conferenceCode || "",
        price: String(data.price ?? "0"),
        audience: data.audience || "all",
        format: data.format || "online",
        venue: data.venue || "",
        trainingStartsAt: toLocalInput(data.trainingStartsAt),
        trainingEndsAt: toLocalInput(data.trainingEndsAt),
        status: data.status || "draft",
        isFeatured: Boolean(data.isFeatured),
        popularOrder: data.popularOrder ?? 0,
        categoryId: data.categoryId ? String(data.categoryId) : "",
        instructorId: data.instructorId ? String(data.instructorId) : "",
        outcomes: (data.outcomes || []).join("\n"),
        examText: data.examText || "",
      });
      setLessons((data.lessons || []).map((lesson: { documents?: { id?: number; name: string; fileUrl: string }[] }) => ({
        ...lesson,
        documents: lesson.documents || [],
      })));
    });
  }, [isNew, params.id]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    let coverUrl: string | null = form.coverUrl || null;
    if (file) {
      const body = new FormData();
      body.append("file", file);
      const uploaded = await authFetch(`${API}/academy/admin/upload`, { method: "POST", body });
      const data = await uploaded.json();
      if (!uploaded.ok) {
        Swal.fire("อัปโหลดไม่สำเร็จ", data.message || "", "error");
        return;
      }
      coverUrl = data.url;
    }
    const payload = {
      ...form,
      coverUrl,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      instructorId: form.instructorId ? Number(form.instructorId) : null,
      popularOrder: Number(form.popularOrder),
      outcomes: form.outcomes.split("\n").map((line) => line.trim()).filter(Boolean),
      lessons,
    };
    const res = await authFetch(
      isNew ? `${API}/academy/admin/courses` : `${API}/academy/admin/courses/${params.id}`,
      { method: isNew ? "POST" : "PUT", body: JSON.stringify(payload) }
    );
    if (!res.ok) {
      const data = await res.json();
      Swal.fire("บันทึกไม่สำเร็จ", data.message || "", "error");
      return;
    }
    router.push("/backoffice/module/academy/courses");
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{isNew ? "เพิ่มคอร์ส" : "แก้ไขคอร์ส"}</h1>
          <p className={styles.subtitle}>หนึ่งบรรทัดในสิ่งที่จะได้เรียนรู้เท่ากับหนึ่งข้อบนหน้าคอร์สแนะนำ</p>
        </div>
        <Link href="/backoffice/module/academy/courses" className={styles.ghost}>กลับ</Link>
      </div>
      <form className={styles.form} onSubmit={onSubmit}>
        <label>ชื่อคอร์ส<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></label>
        <label>คำโปรย<textarea rows={3} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></label>
        <label>สิ่งที่จะได้เรียนรู้<textarea rows={5} value={form.outcomes} onChange={(e) => setForm({ ...form, outcomes: e.target.value })} placeholder="หนึ่งข้อต่อหนึ่งบรรทัด" /></label>
        <div className={styles.row2}>
          <label>หมวดหมู่
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
              <option value="">ไม่ระบุ</option>
              {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>วิทยากร
            <select value={form.instructorId} onChange={(e) => setForm({ ...form, instructorId: e.target.value })}>
              <option value="">ไม่ระบุ</option>
              {instructors.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
        </div>
        <div className={styles.row2}>
          <label>ระยะเวลาที่แสดงบนการ์ด<input value={form.durationLabel} onChange={(e) => setForm({ ...form, durationLabel: e.target.value })} placeholder="2.5 ชม." /></label>
          <label>หน่วยกิต CPE<input value={form.cpeCredits} onChange={(e) => setForm({ ...form, cpeCredits: e.target.value })} /></label>
        </div>
        <div className={styles.row2}>
          <label>Conference Code<input value={form.conferenceCode} onChange={(e) => setForm({ ...form, conferenceCode: e.target.value })} /></label>
          <label>ราคา (0 = ฟรี)<input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
        </div>
        <div className={styles.row2}>
          <label>รูปแบบ
            <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}>
              <option value="online">ออนไลน์</option>
              <option value="onsite">ออนไซต์</option>
            </select>
          </label>
          <label>กลุ่มผู้เรียน
            <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
              <option value="all">ทุกคน</option>
              <option value="general">บุคคลทั่วไป</option>
              <option value="pharmacist">เฉพาะเภสัชกร</option>
            </select>
          </label>
          <label>สถานะ
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">ร่าง</option>
              <option value="published">เผยแพร่</option>
              <option value="archived">เก็บถาวร</option>
            </select>
          </label>
        </div>
        {form.format === "onsite" && (
          <>
            <label>สถานที่<input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} required /></label>
            <div className={styles.row2}>
              <label>เริ่มอบรม<input type="datetime-local" value={form.trainingStartsAt} onChange={(e) => setForm({ ...form, trainingStartsAt: e.target.value })} required /></label>
              <label>สิ้นสุด<input type="datetime-local" value={form.trainingEndsAt} onChange={(e) => setForm({ ...form, trainingEndsAt: e.target.value })} /></label>
            </div>
          </>
        )}
        <div className={styles.row2}>
          <label>ลำดับความนิยม<input type="number" value={form.popularOrder} onChange={(e) => setForm({ ...form, popularOrder: Number(e.target.value) })} /></label>
          <label>รูปปก<input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
        </div>
        {form.coverUrl && <img className={styles.thumb} src={form.coverUrl} alt="" />}
        <label className={styles.checks}>
          <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
          ปักหมุดเป็นคอร์สแนะนำ
        </label>
        <div className={styles.lessonHead}>
          <span>บทเรียน</span>
          <button className={styles.ghost} type="button" onClick={() => { setLessons([...lessons, { title: "", description: "", videoUrl: "", quizText: "", documents: [] }]); setOpenLesson(lessons.length); }}>เพิ่มบท</button>
        </div>
        {lessons.map((lesson, index) => (
          <div className={styles.lesson} key={lesson.id ?? `new-${index}`}>
            <div className={styles.lessonHead}>
              <button className={styles.fold} type="button" onClick={() => setOpenLesson(openLesson === index ? null : index)}>
                {openLesson === index ? "▴" : "▾"} บทที่ {index + 1}{lesson.title.trim() ? ` · ${lesson.title.trim()}` : ""}
              </button>
              <button className={styles.danger} type="button" onClick={() => { setLessons(lessons.filter((_, item) => item !== index)); if (openLesson === index) setOpenLesson(null); }}>ลบ</button>
            </div>
            {openLesson === index && (
            <>
            <label>ชื่อบท<input value={lesson.title} onChange={(e) => setLessons(lessons.map((item, itemIndex) => itemIndex === index ? { ...item, title: e.target.value } : item))} required /></label>
            <label>คำอธิบาย<textarea rows={2} value={lesson.description} onChange={(e) => setLessons(lessons.map((item, itemIndex) => itemIndex === index ? { ...item, description: e.target.value } : item))} /></label>
            <label>ลิงก์วิดีโอ<input value={lesson.videoUrl} onChange={(e) => setLessons(lessons.map((item, itemIndex) => itemIndex === index ? { ...item, videoUrl: e.target.value } : item))} placeholder="YouTube, Vimeo หรือไฟล์ mp4" /></label>
            <div>
              <span>แบบทดสอบท้ายบท</span>
              <QuizEditor name={`lesson-${index}`} value={lesson.quizText} onChange={(quizText) => setLessons(lessons.map((item, itemIndex) => itemIndex === index ? { ...item, quizText } : item))} />
            </div>
            <div>
              <span>เอกสารประกอบ</span>
              {lesson.documents.map((document) => (
                <div className={styles.lessonHead} key={document.fileUrl}>
                  <a href={document.fileUrl} target="_blank" rel="noreferrer">{document.name}</a>
                  <button className={styles.danger} type="button" onClick={() => setLessons(lessons.map((item, itemIndex) => itemIndex === index ? { ...item, documents: item.documents.filter((file) => file.fileUrl !== document.fileUrl) } : item))}>ลบ</button>
                </div>
              ))}
              <label className={styles.addBar}>
                เพิ่มเอกสาร
              <input hidden type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                const body = new FormData();
                body.append("file", file);
                const uploaded = await authFetch(`${API}/academy/admin/upload`, { method: "POST", body });
                const data = await uploaded.json();
                if (!uploaded.ok) {
                  Swal.fire("อัปโหลดไม่สำเร็จ", data.message || "", "error");
                  return;
                }
                setLessons(lessons.map((item, itemIndex) => itemIndex === index ? { ...item, documents: [...item.documents, { name: file.name, fileUrl: data.url }] } : item));
              }} />
              </label>
            </div>
            </>
            )}
          </div>
        ))}
        <div>
          <span>ข้อสอบจบคอร์ส</span>
          <QuizEditor name="exam" value={form.examText} onChange={(examText) => setForm({ ...form, examText })} />
        </div>
        <button className={styles.primary} type="submit">บันทึก</button>
      </form>
    </div>
  );
}

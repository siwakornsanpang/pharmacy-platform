import type { AcademyCourse, AcademyCourseDetail } from '@pharmacy/contracts/academy';
import type { Database } from '../../db/client';
import { formatQuiz } from './quiz';

function iso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function cpeLabel(value: string | null | undefined) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return '0 หน่วยกิต';
  return `${n} หน่วยกิต`;
}

function placeOf(row: Record<string, unknown>) {
  return {
    format: row.format === 'onsite' ? 'onsite' as const : 'online' as const,
    venue: (row.venue as string | null) ?? null,
    trainingStartsAt: iso(row.training_starts_at ?? row.trainingStartsAt),
    trainingEndsAt: iso(row.training_ends_at ?? row.trainingEndsAt),
  };
}

async function reviewStats(db: Database) {
  const rows = (await db.query(
    `SELECT course_id, avg(rating)::text AS avg, count(id)::int AS total FROM academy_reviews GROUP BY course_id`,
  )).rows;
  const map = new Map<number, { rating: number | null; reviewCount: number }>();
  for (const row of rows) {
    map.set(Number(row.course_id), {
      rating: row.avg == null ? null : Math.round(Number(row.avg) * 10) / 10,
      reviewCount: Number(row.total),
    });
  }
  return map;
}

async function enrollmentCounts(db: Database) {
  const rows = (await db.query(
    `SELECT course_id, count(id)::int AS total FROM academy_enrollments WHERE status='active' GROUP BY course_id`,
  )).rows;
  return new Map(rows.map(row => [Number(row.course_id), Number(row.total)]));
}

async function outcomesByCourse(db: Database, courseIds: number[]) {
  const map = new Map<number, string[]>();
  if (!courseIds.length) return map;
  const rows = (await db.query(
    `SELECT course_id, text FROM academy_course_outcomes WHERE course_id = ANY($1::int[])
     ORDER BY sort_order ASC, id ASC`,
    [courseIds],
  )).rows;
  for (const row of rows) {
    const id = Number(row.course_id);
    const list = map.get(id) ?? [];
    list.push(row.text as string);
    map.set(id, list);
  }
  return map;
}

function toCourse(row: Record<string, unknown>, stats: Map<number, { rating: number | null; reviewCount: number }>, learners: Map<number, number>, outcomes: string[]): AcademyCourse {
  const id = Number(row.id);
  return {
    id,
    title: row.title as string,
    summary: (row.summary as string | null) ?? null,
    coverUrl: (row.cover_url as string | null) ?? null,
    durationLabel: (row.duration_label as string | null) ?? null,
    cpeLabel: cpeLabel(row.cpe_credits as string | null),
    categoryName: (row.category_name as string | null) ?? null,
    categoryColor: (row.category_color as string | null) ?? null,
    instructorName: (row.instructor_name as string | null) ?? null,
    instructorTitle: (row.instructor_title as string | null) ?? null,
    studentCount: learners.get(id) ?? 0,
    rating: stats.get(id)?.rating ?? null,
    reviewCount: stats.get(id)?.reviewCount ?? 0,
    outcomes,
    isFeatured: Boolean(row.is_featured),
    ...placeOf(row),
  };
}

export async function listPublishedCourses(db: Database, query: { category?: string; q?: string; featured?: string }): Promise<AcademyCourse[]> {
  const filters = [`c.status = 'published'`];
  const values: unknown[] = [];
  if (query.q?.trim()) {
    values.push(`%${query.q.trim()}%`);
    filters.push(`c.title ILIKE $${values.length}`);
  }
  if (query.featured === '1') filters.push('c.is_featured = true');
  const rows = (await db.query(
    `SELECT c.id, c.title, c.summary, c.cover_url, c.duration_label, c.cpe_credits, c.format, c.venue,
            c.training_starts_at, c.training_ends_at, c.is_featured,
            cat.name AS category_name, cat.color AS category_color,
            i.name AS instructor_name, i.title AS instructor_title
     FROM academy_courses c
     LEFT JOIN academy_categories cat ON cat.id = c.category_id
     LEFT JOIN academy_instructors i ON i.id = c.instructor_id
     WHERE ${filters.join(' AND ')}
     ORDER BY c.popular_order ASC, c.published_at DESC NULLS LAST, c.id ASC`,
    values,
  )).rows;
  const filtered = query.category && query.category !== 'ทั้งหมด'
    ? rows.filter(row => row.category_name === query.category)
    : rows;
  const stats = await reviewStats(db);
  const learners = await enrollmentCounts(db);
  const ids = filtered.map(row => Number(row.id));
  const outcomeMap = query.featured === '1' ? await outcomesByCourse(db, ids) : new Map<number, string[]>();
  return filtered.map(row => toCourse(row, stats, learners, outcomeMap.get(Number(row.id)) ?? []));
}

export async function readPublishedCourse(db: Database, id: number): Promise<AcademyCourseDetail | null> {
  return loadCourseDetail(db, id, true);
}

export async function loadCourseDetail(db: Database, id: number, publishedOnly = false): Promise<AcademyCourseDetail | null> {
  const row = (await db.query(
    `SELECT c.id, c.title, c.summary, c.cover_url, c.duration_label, c.cpe_credits, c.conference_code,
            c.price, c.audience, c.format, c.venue, c.training_starts_at, c.training_ends_at, c.is_featured,
            cat.name AS category_name, cat.color AS category_color,
            i.name AS instructor_name, i.title AS instructor_title, i.expertise AS instructor_expertise,
            i.image_url AS instructor_image_url
     FROM academy_courses c
     LEFT JOIN academy_categories cat ON cat.id = c.category_id
     LEFT JOIN academy_instructors i ON i.id = c.instructor_id
     WHERE c.id = $1${publishedOnly ? " AND c.status = 'published'" : ''}`,
    [id],
  )).rows[0];
  if (!row) return null;
  const stats = await reviewStats(db);
  const learners = await enrollmentCounts(db);
  const outcomes = (await outcomesByCourse(db, [id])).get(id) ?? [];
  const lessons = (await db.query(
    `SELECT id, title, description FROM academy_lessons WHERE course_id=$1 ORDER BY sort_order ASC, id ASC`,
    [id],
  )).rows;
  return {
    ...toCourse(row, stats, learners, outcomes),
    cpeCredits: (row.cpe_credits as string | null) ?? null,
    conferenceCode: (row.conference_code as string | null) ?? null,
    price: String(row.price ?? '0'),
    audience: String(row.audience ?? 'all'),
    instructorExpertise: (row.instructor_expertise as string | null) ?? null,
    instructorImageUrl: (row.instructor_image_url as string | null) ?? null,
    lessons: lessons.map(lesson => ({
      id: Number(lesson.id),
      title: lesson.title as string,
      description: (lesson.description as string | null) ?? null,
    })),
  };
}

export async function listAdminCourses(db: Database) {
  const rows = (await db.query(
    `SELECT c.id, c.title, c.summary, c.cover_url, c.status, c.price, c.format, c.is_featured, c.updated_at,
            cat.name AS category_name, i.name AS instructor_name
     FROM academy_courses c
     LEFT JOIN academy_categories cat ON cat.id = c.category_id
     LEFT JOIN academy_instructors i ON i.id = c.instructor_id
     ORDER BY c.updated_at DESC NULLS LAST, c.id DESC`,
  )).rows;
  return rows.map(row => ({
    id: Number(row.id),
    title: row.title as string,
    summary: (row.summary as string | null) ?? null,
    coverUrl: (row.cover_url as string | null) ?? null,
    status: row.status as string,
    price: String(row.price ?? '0'),
    format: row.format === 'onsite' ? 'onsite' : 'online',
    isFeatured: Boolean(row.is_featured),
    categoryName: (row.category_name as string | null) ?? null,
    instructorName: (row.instructor_name as string | null) ?? null,
  }));
}

export async function loadAdminCourse(db: Database, id: number) {
  const row = (await db.query(`SELECT * FROM academy_courses WHERE id=$1`, [id])).rows[0];
  if (!row) return null;
  const outcomes = (await db.query(
    `SELECT text FROM academy_course_outcomes WHERE course_id=$1 ORDER BY sort_order ASC, id ASC`, [id],
  )).rows;
  const lessons = (await db.query(
    `SELECT id,title,description,video_url,quiz FROM academy_lessons WHERE course_id=$1 ORDER BY sort_order ASC, id ASC`,
    [id],
  )).rows;
  const documents = lessons.length
    ? (await db.query(
      `SELECT id,lesson_id,name,file_url FROM academy_lesson_documents WHERE lesson_id = ANY($1::int[])
       ORDER BY sort_order ASC, id ASC`,
      [lessons.map(lesson => Number(lesson.id))],
    )).rows
    : [];
  return {
    id: Number(row.id),
    title: row.title as string,
    summary: (row.summary as string | null) ?? null,
    coverUrl: (row.cover_url as string | null) ?? null,
    durationLabel: (row.duration_label as string | null) ?? null,
    cpeCredits: (row.cpe_credits as string | null) ?? null,
    conferenceCode: (row.conference_code as string | null) ?? null,
    price: String(row.price ?? '0'),
    audience: String(row.audience ?? 'all'),
    format: row.format === 'onsite' ? 'onsite' as const : 'online' as const,
    venue: (row.venue as string | null) ?? null,
    trainingStartsAt: iso(row.training_starts_at),
    trainingEndsAt: iso(row.training_ends_at),
    status: row.status as string,
    isFeatured: Boolean(row.is_featured),
    categoryId: row.category_id == null ? null : Number(row.category_id),
    instructorId: row.instructor_id == null ? null : Number(row.instructor_id),
    examText: formatQuiz(row.exam),
    outcomes: outcomes.map(item => item.text as string),
    lessons: lessons.map(lesson => ({
      id: Number(lesson.id),
      title: lesson.title as string,
      description: (lesson.description as string | null) ?? '',
      videoUrl: (lesson.video_url as string | null) ?? '',
      quizText: formatQuiz(lesson.quiz),
      documents: documents.filter(document => Number(document.lesson_id) === Number(lesson.id)).map(document => ({
        id: Number(document.id),
        name: document.name as string,
        fileUrl: document.file_url as string,
      })),
    })),
  };
}

export async function listMemberEnrollments(db: Database, license: string) {
  const rows = (await db.query(
    `SELECT e.course_id, c.title, c.cover_url, e.status, e.progress_percent
     FROM academy_enrollments e
     INNER JOIN academy_courses c ON c.id = e.course_id
     WHERE e.pharmacist_license = $1
     ORDER BY e.enrolled_at DESC NULLS LAST, e.id DESC`,
    [license],
  )).rows;
  return rows.map(row => ({
    courseId: Number(row.course_id),
    title: row.title as string,
    coverUrl: (row.cover_url as string | null) ?? null,
    status: row.status as string,
    progressPercent: Number(row.progress_percent ?? 0),
  }));
}

export async function countPaidOrders(db: Database, license: string, courseId: number) {
  const row = (await db.query(
    `SELECT count(*)::int AS total FROM academy_orders
     WHERE pharmacist_license=$1 AND course_id=$2 AND status='paid'`,
    [license, courseId],
  )).rows[0];
  return Number(row?.total ?? 0);
}

export async function countActiveEnrollments(db: Database, license: string, courseId: number) {
  const row = (await db.query(
    `SELECT count(*)::int AS total FROM academy_enrollments
     WHERE pharmacist_license=$1 AND course_id=$2 AND status='active'`,
    [license, courseId],
  )).rows[0];
  return Number(row?.total ?? 0);
}

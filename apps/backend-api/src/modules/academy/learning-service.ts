import type { AcademyCertificate, AcademyLearningState, AcademyMemberActor } from '@pharmacy/contracts/academy';
import type { QueryClient } from '../../db/client';
import type { AcademyDependencies } from './public';
import { AcademyError } from './public';
import { publicQuiz, type QuizQuestion } from './quiz';

async function refreshProgress(tx: QueryClient, enrollmentId: number, courseId: number, license: string) {
  const course = (await tx.query(`SELECT exam FROM academy_courses WHERE id=$1`, [courseId])).rows[0];
  const enrollment = (await tx.query(`SELECT exam_passed FROM academy_enrollments WHERE id=$1`, [enrollmentId])).rows[0];
  const lessons = (await tx.query(`SELECT id FROM academy_lessons WHERE course_id=$1`, [courseId])).rows;
  const done = (await tx.query(
    `SELECT lesson_id FROM academy_lesson_progress WHERE pharmacist_license=$1 AND is_completed=true`,
    [license],
  )).rows;
  const doneIds = new Set(done.map(row => Number(row.lesson_id)));
  const finished = lessons.filter(row => doneIds.has(Number(row.id))).length;
  const exam = Array.isArray(course?.exam) ? course.exam as QuizQuestion[] : [];
  const hasExam = exam.length > 0;
  const lessonRatio = lessons.length ? finished / lessons.length : 1;
  const percent = hasExam ? (enrollment?.exam_passed ? 100 : Math.round(lessonRatio * 80)) : Math.round(lessonRatio * 100);
  await tx.query(`UPDATE academy_enrollments SET progress_percent=$1 WHERE id=$2`, [String(percent), enrollmentId]);
  return { percent, lessonsDone: lessons.length === 0 || finished === lessons.length, exam };
}

function iso(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function createLearningService(deps: AcademyDependencies) {
  return {
    async completeLesson(actor: AcademyMemberActor, id: number, answers: string[]): Promise<{ success: true; progressPercent: number }> {
      return deps.db.withTransaction(async tx => {
        const lesson = (await tx.query(`SELECT id,course_id,quiz FROM academy_lessons WHERE id=$1`, [id])).rows[0];
        if (!lesson) throw new AcademyError(404, 'ไม่พบบทเรียน');
        const enrollment = (await tx.query(
          `SELECT id FROM academy_enrollments WHERE course_id=$1 AND pharmacist_license=$2 AND status='active' FOR UPDATE`,
          [lesson.course_id, actor.pharmacistLicense],
        )).rows[0];
        if (!enrollment) throw new AcademyError(403, 'ยังไม่ได้ลงทะเบียนเรียน');
        const quiz = Array.isArray(lesson.quiz) ? lesson.quiz as QuizQuestion[] : [];
        if (quiz.length && !quiz.every((item, index) => answers[index] === item.answer))
          throw new AcademyError(400, 'คำตอบยังไม่ถูกต้อง');
        const current = (await tx.query(
          `SELECT id FROM academy_lesson_progress WHERE lesson_id=$1 AND pharmacist_license=$2`,
          [id, actor.pharmacistLicense],
        )).rows[0];
        if (current) await tx.query(`UPDATE academy_lesson_progress SET is_completed=true,updated_at=$1 WHERE id=$2`, [deps.clock(), current.id]);
        else await tx.query(
          `INSERT INTO academy_lesson_progress(pharmacist_license,lesson_id,is_completed) VALUES($1,$2,true)`,
          [actor.pharmacistLicense, id],
        );
        const { percent } = await refreshProgress(tx, Number(enrollment.id), Number(lesson.course_id), actor.pharmacistLicense);
        return { success: true as const, progressPercent: percent };
      });
    },

    async submitExam(actor: AcademyMemberActor, courseId: number, answers: string[]): Promise<{ success: true; progressPercent: number }> {
      return deps.db.withTransaction(async tx => {
        const course = (await tx.query(`SELECT id,exam FROM academy_courses WHERE id=$1`, [courseId])).rows[0];
        if (!course) throw new AcademyError(404, 'ไม่พบคอร์ส');
        const enrollment = (await tx.query(
          `SELECT id FROM academy_enrollments WHERE course_id=$1 AND pharmacist_license=$2 AND status='active' FOR UPDATE`,
          [courseId, actor.pharmacistLicense],
        )).rows[0];
        if (!enrollment) throw new AcademyError(403, 'ยังไม่ได้ลงทะเบียนเรียน');
        const { lessonsDone, exam, percent } = await refreshProgress(tx, Number(enrollment.id), courseId, actor.pharmacistLicense);
        if (!lessonsDone) throw new AcademyError(400, 'เรียนทุกบทให้จบก่อนสอบ');
        if (!exam.length) throw new AcademyError(400, 'คอร์สนี้ไม่มีข้อสอบจบ');
        if (!exam.every((item, index) => answers[index] === item.answer))
          throw new AcademyError(400, 'คำตอบยังไม่ถูกต้อง');
        await tx.query(`UPDATE academy_enrollments SET exam_passed=true WHERE id=$1`, [enrollment.id]);
        const passed = await refreshProgress(tx, Number(enrollment.id), courseId, actor.pharmacistLicense);
        return { success: true as const, progressPercent: passed.percent || percent };
      });
    },

    async getCertificate(actor: AcademyMemberActor, courseId: number): Promise<AcademyCertificate> {
      return deps.db.withTransaction(async tx => {
        const row = (await tx.query(
          `SELECT e.id,e.display_name,e.pharmacist_license,e.progress_percent,c.title,c.cpe_credits,c.conference_code
           FROM academy_enrollments e INNER JOIN academy_courses c ON c.id = e.course_id
           WHERE e.course_id=$1 AND e.pharmacist_license=$2 AND e.status='active' FOR UPDATE OF e`,
          [courseId, actor.pharmacistLicense],
        )).rows[0];
        if (!row) throw new AcademyError(404, 'ไม่พบการลงทะเบียน');
        if (Number(row.progress_percent) < 100) throw new AcademyError(400, 'เรียนให้จบก่อนรับใบประกาศ');
        const existing = (await tx.query(`SELECT code,issued_at FROM academy_certificates WHERE enrollment_id=$1`, [row.id])).rows[0];
        const certificate = existing ?? (await tx.query(
          `INSERT INTO academy_certificates(enrollment_id,code,issued_at) VALUES($1,$2,$3) RETURNING code,issued_at`,
          [row.id, `AC${deps.clock().getUTCFullYear()}${String(row.id).padStart(5, '0')}`, deps.clock()],
        )).rows[0]!;
        return {
          code: certificate.code as string,
          issuedAt: iso(certificate.issued_at),
          learnerName: (row.display_name as string | null) ?? null,
          pharmacistLicense: row.pharmacist_license as string,
          courseTitle: row.title as string,
          cpeCredits: (row.cpe_credits as string | null) ?? null,
          conferenceCode: (row.conference_code as string | null) ?? null,
        };
      });
    },

    async getLearning(actor: AcademyMemberActor, courseId: number): Promise<AcademyLearningState> {
      const course = (await deps.db.query(
        `SELECT format,venue,training_starts_at,training_ends_at,price,exam FROM academy_courses WHERE id=$1 AND status='published'`,
        [courseId],
      )).rows[0];
      if (!course) throw new AcademyError(404, 'ไม่พบคอร์ส');
      const enrollment = (await deps.db.query(
        `SELECT id,progress_percent,exam_passed FROM academy_enrollments
         WHERE course_id=$1 AND pharmacist_license=$2 AND status='active'`,
        [courseId, actor.pharmacistLicense],
      )).rows[0];
      const lessons = (await deps.db.query(
        `SELECT id,title,description,video_url,quiz FROM academy_lessons WHERE course_id=$1 ORDER BY sort_order ASC, id ASC`,
        [courseId],
      )).rows;
      const documents = enrollment && lessons.length
        ? (await deps.db.query(
          `SELECT lesson_id,name,file_url FROM academy_lesson_documents WHERE lesson_id = ANY($1::int[]) ORDER BY sort_order ASC, id ASC`,
          [lessons.map(row => Number(row.id))],
        )).rows
        : [];
      const progress = enrollment
        ? (await deps.db.query(
          `SELECT lesson_id FROM academy_lesson_progress WHERE pharmacist_license=$1 AND is_completed=true`,
          [actor.pharmacistLicense],
        )).rows
        : [];
      const done = new Set(progress.map(row => Number(row.lesson_id)));
      const lessonsDone = lessons.every(lesson => done.has(Number(lesson.id)));
      const exam = Array.isArray(course.exam) ? course.exam as QuizQuestion[] : [];
      const order = (await deps.db.query(
        `SELECT status FROM academy_orders WHERE course_id=$1 AND pharmacist_license=$2 ORDER BY created_at DESC LIMIT 1`,
        [courseId, actor.pharmacistLicense],
      )).rows[0];
      return {
        enrolled: Boolean(enrollment),
        format: course.format === 'onsite' ? 'onsite' : 'online',
        venue: (course.venue as string | null) ?? null,
        trainingStartsAt: iso(course.training_starts_at),
        trainingEndsAt: iso(course.training_ends_at),
        orderStatus: (order?.status as string | null) ?? null,
        progressPercent: Number(enrollment?.progress_percent ?? 0),
        price: String(course.price ?? '0'),
        hasExam: exam.length > 0,
        examPassed: Boolean(enrollment?.exam_passed),
        exam: enrollment && lessonsDone ? publicQuiz(exam) : [],
        lessons: lessons.map(lesson => ({
          id: Number(lesson.id),
          title: lesson.title as string,
          description: (lesson.description as string | null) ?? null,
          videoUrl: enrollment ? (lesson.video_url as string | null) : null,
          completed: done.has(Number(lesson.id)),
          documents: documents.filter(document => Number(document.lesson_id) === Number(lesson.id)).map(document => ({
            name: document.name as string, fileUrl: document.file_url as string,
          })),
          quiz: enrollment ? publicQuiz(lesson.quiz) : [],
        })),
      };
    },
  };
}

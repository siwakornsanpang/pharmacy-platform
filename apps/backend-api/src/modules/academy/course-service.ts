import type { AcademyCourseDetail, AcademyCourseInput, AcademyLessonInput } from '@pharmacy/contracts/academy';
import type { AssetId } from '@pharmacy/contracts/media';
import type { StaffActor } from '../access/service';
import type { QueryClient } from '../../db/client';
import type { AcademyDependencies } from './public';
import { AcademyError } from './public';
import { loadCourseDetail } from './queries';
import { parseQuiz } from './quiz';
import { commitAcademyAssets } from './media';

function numericText(value: unknown, fallback = '0') {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : fallback;
}

function courseMode(value: unknown, fallback: 'online' | 'onsite' = 'online') {
  return value === 'onsite' || value === 'online' ? value : fallback;
}

function dateOrNull(value: unknown) {
  if (value == null || value === '') return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

async function syncLessons(tx: QueryClient, courseId: number, lessons: AcademyLessonInput[]) {
  const existing = (await tx.query('SELECT id FROM academy_lessons WHERE course_id=$1', [courseId])).rows;
  const existingIds = new Set(existing.map(row => Number(row.id)));
  const keep = new Set<number>();
  for (const [index, lesson] of lessons.entries()) {
    const title = lesson.title?.trim();
    if (!title) continue;
    const currentId = Number(lesson.id);
    if (currentId) {
      const owned = (await tx.query('SELECT course_id FROM academy_lessons WHERE id=$1', [currentId])).rows[0];
      if (!owned || Number(owned.course_id) !== courseId) throw new AcademyError(400, 'Invalid nested lesson');
      for (const document of lesson.documents ?? []) {
        const documentId = Number(document.id);
        if (!documentId) continue;
        const row = (await tx.query(
          `SELECT d.id, l.course_id FROM academy_lesson_documents d
           INNER JOIN academy_lessons l ON l.id = d.lesson_id WHERE d.id=$1`,
          [documentId],
        )).rows[0];
        if (!row || Number(row.course_id) !== courseId) throw new AcademyError(400, 'Invalid nested document');
      }
    }
    const quiz = parseQuiz(lesson.quizText || '');
    let lessonId = currentId;
    if (currentId && existingIds.has(currentId)) {
      await tx.query(
        `UPDATE academy_lessons SET title=$1,description=$2,video_url=$3,sort_order=$4,quiz=$5::json WHERE id=$6`,
        [title, lesson.description?.trim() || null, lesson.videoUrl?.trim() || null, index, JSON.stringify(quiz), currentId],
      );
      keep.add(currentId);
    } else {
      const created = (await tx.query(
        `INSERT INTO academy_lessons(course_id,title,description,video_url,sort_order,quiz)
         VALUES($1,$2,$3,$4,$5,$6::json) RETURNING id`,
        [courseId, title, lesson.description?.trim() || null, lesson.videoUrl?.trim() || null, index, JSON.stringify(quiz)],
      )).rows[0]!;
      lessonId = Number(created.id);
      keep.add(lessonId);
    }
    const docs = (await tx.query('SELECT id FROM academy_lesson_documents WHERE lesson_id=$1', [lessonId])).rows;
    const keepDocs = new Set<number>();
    for (const [docIndex, document] of (lesson.documents ?? []).entries()) {
      const name = document.name?.trim();
      const fileUrl = document.fileUrl?.trim();
      if (!name || !fileUrl) continue;
      const documentId = Number(document.id);
      if (documentId && docs.some(row => Number(row.id) === documentId)) {
        await tx.query(
          `UPDATE academy_lesson_documents SET name=$1,file_url=$2,sort_order=$3 WHERE id=$4`,
          [name, fileUrl, docIndex, documentId],
        );
        keepDocs.add(documentId);
      } else {
        const created = (await tx.query(
          `INSERT INTO academy_lesson_documents(lesson_id,name,file_url,sort_order) VALUES($1,$2,$3,$4) RETURNING id`,
          [lessonId, name, fileUrl, docIndex],
        )).rows[0]!;
        keepDocs.add(Number(created.id));
      }
    }
    const removedDocs = docs.filter(row => !keepDocs.has(Number(row.id)));
    if (removedDocs.length)
      await tx.query(`DELETE FROM academy_lesson_documents WHERE id = ANY($1::int[])`, [removedDocs.map(row => Number(row.id))]);
  }
  const removed = existing.filter(row => !keep.has(Number(row.id)));
  if (removed.length)
    await tx.query(`DELETE FROM academy_lessons WHERE id = ANY($1::int[])`, [removed.map(row => Number(row.id))]);
}

export function createCourseService(deps: AcademyDependencies) {
  async function writeCourse(tx: QueryClient, id: number | null, input: AcademyCourseInput, now: Date) {
    const title = input.title.trim();
    if (!title) throw new AcademyError(400, 'กรุณาระบุชื่อคอร์ส');
    const format = courseMode(input.format);
    const venue = input.venue?.trim() || null;
    const trainingStartsAt = dateOrNull(input.trainingStartsAt);
    if (format === 'onsite' && (!venue || !trainingStartsAt))
      throw new AcademyError(400, 'คอร์สออนไซต์ต้องระบุสถานที่และวันอบรม');
    const status = input.status ?? 'draft';
    const values = [
      title, input.summary?.trim() || null, input.coverUrl || null, input.durationLabel?.trim() || null,
      numericText(input.cpeCredits), input.conferenceCode?.trim() || null, numericText(input.price),
      input.audience ?? 'all', format, venue, trainingStartsAt, dateOrNull(input.trainingEndsAt),
      status, Boolean(input.isFeatured), JSON.stringify(parseQuiz(input.examText ?? '')),
      input.categoryId ?? null, input.instructorId ?? null,
      status === 'published' ? now : null, now,
    ];
    let courseId = id;
    if (!courseId) {
      courseId = Number((await tx.query(
        `INSERT INTO academy_courses(title,summary,cover_url,duration_label,cpe_credits,conference_code,price,audience,format,venue,training_starts_at,training_ends_at,status,is_featured,exam,category_id,instructor_id,published_at,created_at,updated_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::json,$16,$17,$18,$19,$19) RETURNING id`,
        values,
      )).rows[0]!.id);
    } else {
      const existing = (await tx.query('SELECT id,published_at FROM academy_courses WHERE id=$1 FOR UPDATE', [courseId])).rows[0];
      if (!existing) throw new AcademyError(404, 'ไม่พบคอร์ส');
      const publishedAt = (existing.published_at as Date | string | null) ?? null;
      values[17] = status === 'published' ? publishedAt ?? now : publishedAt;
      await tx.query(
        `UPDATE academy_courses SET title=$1,summary=$2,cover_url=$3,duration_label=$4,cpe_credits=$5,conference_code=$6,price=$7,audience=$8,format=$9,venue=$10,training_starts_at=$11,training_ends_at=$12,status=$13,is_featured=$14,exam=$15::json,category_id=$16,instructor_id=$17,published_at=$18,updated_at=$19 WHERE id=$20`,
        [...values, courseId],
      );
    }
    if (input.outcomes) {
      await tx.query('DELETE FROM academy_course_outcomes WHERE course_id=$1', [courseId]);
      const outcomes = input.outcomes.map(item => item.trim()).filter(Boolean);
      for (const [index, text] of outcomes.entries()) {
        await tx.query(
          `INSERT INTO academy_course_outcomes(course_id,text,sort_order) VALUES($1,$2,$3)`,
          [courseId, text, index],
        );
      }
    }
    if (input.lessons) await syncLessons(tx, courseId, input.lessons);
    return courseId;
  }

  return {
    async saveCourse(_actor: StaffActor, id: number | null, input: AcademyCourseInput): Promise<AcademyCourseDetail> {
      const now = deps.clock();
      let savedId = id;
      const persist = async (tx: QueryClient) => {
        savedId = await writeCourse(tx, id, input, now);
        if (!id && input.coverAssetId) {
          await tx.query(
            `UPDATE academy_asset_refs SET owner_id=$1 WHERE owner_type='course' AND owner_id='draft' AND owner_slot='cover'`,
            [String(savedId)],
          );
        }
      };
      if (input.coverAssetId && deps.media) {
        const owner = { domain: 'academy' as const, type: 'course', id: String(id ?? 'draft'), slot: 'cover' };
        const previous = id ? (await deps.db.query(
          `SELECT asset_id FROM academy_asset_refs WHERE owner_type='course' AND owner_id=$1 AND owner_slot='cover'`,
          [String(id)],
        )).rows.map(row => row.asset_id as AssetId) : [];
        const result = await commitAcademyAssets({
          db: deps.db, media: deps.media, owner, attachAssetIds: [input.coverAssetId],
          releaseAssetIds: previous.filter(assetId => assetId !== input.coverAssetId),
          write: persist,
        });
        if (result.failedReferenceCommit)
          throw result.error instanceof AcademyError ? result.error : new AcademyError(503, 'Academy media operations temporarily unavailable');
      } else {
        await deps.db.withTransaction(persist);
      }
      const detail = await loadCourseDetail(deps.db, savedId!);
      if (!detail) throw new AcademyError(503, 'Academy temporarily unavailable');
      return detail;
    },

    async deleteCourse(_actor: StaffActor, id: number): Promise<{ success: true }> {
      const existing = (await deps.db.query('SELECT id FROM academy_courses WHERE id=$1', [id])).rows[0];
      if (!existing) throw new AcademyError(404, 'ไม่พบคอร์ส');
      const refs = (await deps.db.query(
        `SELECT owner_slot, asset_id FROM academy_asset_refs WHERE owner_type='course' AND owner_id=$1`,
        [String(id)],
      )).rows;
      await deps.db.withTransaction(async tx => {
        await tx.query(`DELETE FROM academy_asset_refs WHERE owner_type='course' AND owner_id=$1`, [String(id)]);
        await tx.query('DELETE FROM academy_courses WHERE id=$1', [id]);
      });
      if (deps.media && refs.length) {
        const bySlot = new Map<string, AssetId[]>();
        for (const row of refs) {
          const list = bySlot.get(row.owner_slot as string) ?? [];
          list.push(row.asset_id as AssetId);
          bySlot.set(row.owner_slot as string, list);
        }
        for (const [slot, assetIds] of bySlot)
          await deps.media.release({ domain: 'academy', type: 'course', id: String(id), slot }, assetIds);
      }
      return { success: true };
    },
  };
}

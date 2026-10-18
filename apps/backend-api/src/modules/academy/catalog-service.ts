import type { StaffActor } from '../access/service';
import type { AcademyDependencies } from './public';
import { AcademyError } from './public';

export function createCatalogService(deps: AcademyDependencies) {
  return {
    async saveCategory(_actor: StaffActor, id: number | null, body: Record<string, unknown>) {
      const name = String(body.name ?? '').trim();
      if (!name) throw new AcademyError(400, 'กรุณาระบุชื่อหมวดหมู่');
      return deps.db.withTransaction(async tx => {
        if (!id) {
          const created = (await tx.query(
            `INSERT INTO academy_categories(name,description,image_url,color,sort_order,is_visible)
             VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
            [name, String(body.description ?? '').trim() || null, body.imageUrl || null,
              body.color || '#737300', Number(body.sortOrder ?? 0), body.isVisible ?? true],
          )).rows[0]!;
          return { success: true as const, id: Number(created.id) };
        }
        const existing = (await tx.query('SELECT id FROM academy_categories WHERE id=$1 FOR UPDATE', [id])).rows[0];
        if (!existing) throw new AcademyError(404, 'ไม่พบหมวดหมู่');
        await tx.query(
          `UPDATE academy_categories SET name=$1,description=$2,image_url=$3,color=$4,sort_order=$5,is_visible=$6,updated_at=$7 WHERE id=$8`,
          [name, body.description !== undefined ? String(body.description).trim() || null : null,
            body.imageUrl !== undefined ? body.imageUrl : null, body.color || '#737300',
            Number(body.sortOrder ?? 0), body.isVisible ?? true, deps.clock(), id],
        );
        return { success: true as const, id };
      });
    },

    async deleteCategory(_actor: StaffActor, id: number) {
      return deps.db.withTransaction(async tx => {
        const existing = (await tx.query('SELECT id FROM academy_categories WHERE id=$1 FOR UPDATE', [id])).rows[0];
        if (!existing) throw new AcademyError(404, 'ไม่พบหมวดหมู่');
        await tx.query('DELETE FROM academy_categories WHERE id=$1', [id]);
        return { success: true as const };
      });
    },

    async saveInstructor(_actor: StaffActor, id: number | null, body: Record<string, unknown>) {
      const name = String(body.name ?? '').trim();
      if (!name) throw new AcademyError(400, 'กรุณาระบุชื่อวิทยากร');
      return deps.db.withTransaction(async tx => {
        if (!id) {
          const created = (await tx.query(
            `INSERT INTO academy_instructors(name,title,expertise,image_url,sort_order,is_visible)
             VALUES($1,$2,$3,$4,$5,$6) RETURNING id`,
            [name, String(body.title ?? '').trim() || null, String(body.expertise ?? '').trim() || null,
              body.imageUrl || null, Number(body.sortOrder ?? 0), body.isVisible ?? true],
          )).rows[0]!;
          return { success: true as const, id: Number(created.id) };
        }
        const existing = (await tx.query('SELECT id FROM academy_instructors WHERE id=$1 FOR UPDATE', [id])).rows[0];
        if (!existing) throw new AcademyError(404, 'ไม่พบวิทยากร');
        await tx.query(
          `UPDATE academy_instructors SET name=$1,title=$2,expertise=$3,image_url=$4,sort_order=$5,is_visible=$6,updated_at=$7 WHERE id=$8`,
          [name, String(body.title ?? '').trim() || null, String(body.expertise ?? '').trim() || null,
            body.imageUrl || null, Number(body.sortOrder ?? 0), body.isVisible ?? true, deps.clock(), id],
        );
        return { success: true as const, id };
      });
    },

    async deleteInstructor(_actor: StaffActor, id: number) {
      return deps.db.withTransaction(async tx => {
        const existing = (await tx.query('SELECT id FROM academy_instructors WHERE id=$1 FOR UPDATE', [id])).rows[0];
        if (!existing) throw new AcademyError(404, 'ไม่พบวิทยากร');
        await tx.query('DELETE FROM academy_instructors WHERE id=$1', [id]);
        return { success: true as const };
      });
    },

    async saveReview(_actor: StaffActor, body: Record<string, unknown>) {
      const courseId = Number(body.courseId);
      const rating = Number(body.rating);
      const text = String(body.body ?? '').trim();
      const reviewerName = String(body.reviewerName ?? '').trim();
      if (!Number.isSafeInteger(courseId) || courseId < 1 || !Number.isSafeInteger(rating) || rating < 1 || rating > 5 || !text || !reviewerName)
        throw new AcademyError(400, 'ข้อมูลรีวิวไม่ครบ');
      return deps.db.withTransaction(async tx => {
        const course = (await tx.query('SELECT id FROM academy_courses WHERE id=$1', [courseId])).rows[0];
        if (!course) throw new AcademyError(404, 'ไม่พบคอร์ส');
        const created = (await tx.query(
          `INSERT INTO academy_reviews(course_id,rating,body,reviewer_name,reviewer_role) VALUES($1,$2,$3,$4,$5) RETURNING id`,
          [courseId, rating, text, reviewerName, String(body.reviewerRole ?? '').trim() || null],
        )).rows[0]!;
        return { success: true as const, id: Number(created.id) };
      });
    },

    async deleteReview(_actor: StaffActor, id: number) {
      return deps.db.withTransaction(async tx => {
        const existing = (await tx.query('SELECT id FROM academy_reviews WHERE id=$1 FOR UPDATE', [id])).rows[0];
        if (!existing) throw new AcademyError(404, 'ไม่พบรีวิว');
        await tx.query('DELETE FROM academy_reviews WHERE id=$1', [id]);
        return { success: true as const };
      });
    },
  };
}

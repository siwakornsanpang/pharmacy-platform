import type { AcademyCommandResult, AcademyMemberActor } from '@pharmacy/contracts/academy';
import type { AcademyDependencies } from './public';
import { AcademyError } from './public';

export function createEnrollmentService(deps: AcademyDependencies) {
  return {
    async enrollFree(actor: AcademyMemberActor, courseId: number): Promise<AcademyCommandResult> {
      return deps.db.withTransaction(async tx => {
        const course = (await tx.query(
          `SELECT id,price FROM academy_courses WHERE id=$1 AND status='published' FOR UPDATE`,
          [courseId],
        )).rows[0];
        if (!course) throw new AcademyError(404, 'ไม่พบคอร์ส');
        if (Number(course.price) > 0) throw new AcademyError(400, 'คอร์สนี้ต้องแจ้งชำระเงินก่อนเข้าเรียน');
        const existing = (await tx.query(
          `SELECT id,status FROM academy_enrollments WHERE course_id=$1 AND pharmacist_license=$2 FOR UPDATE`,
          [courseId, actor.pharmacistLicense],
        )).rows[0];
        if (existing) {
          if (existing.status !== 'active')
            await tx.query(`UPDATE academy_enrollments SET status='active' WHERE id=$1`, [existing.id]);
          return { success: true as const, enrollmentId: Number(existing.id) };
        }
        const created = (await tx.query(
          `INSERT INTO academy_enrollments(course_id,pharmacist_license,display_name,status)
           VALUES($1,$2,$3,'active')
           ON CONFLICT (pharmacist_license, course_id)
           DO UPDATE SET status='active', display_name=COALESCE(EXCLUDED.display_name, academy_enrollments.display_name)
           RETURNING id`,
          [courseId, actor.pharmacistLicense, actor.displayName],
        )).rows[0]!;
        return { success: true as const, enrollmentId: Number(created.id) };
      });
    },

    async cancelEnrollment(actor: AcademyMemberActor, courseId: number): Promise<AcademyCommandResult> {
      return deps.db.withTransaction(async tx => {
        const enrollment = (await tx.query(
          `SELECT id,progress_percent FROM academy_enrollments
           WHERE course_id=$1 AND pharmacist_license=$2 AND status='active' FOR UPDATE`,
          [courseId, actor.pharmacistLicense],
        )).rows[0];
        if (!enrollment) throw new AcademyError(404, 'ไม่พบการลงทะเบียน');
        if (Number(enrollment.progress_percent) >= 100) throw new AcademyError(400, 'เรียนจบแล้ว ยกเลิกไม่ได้');
        await tx.query(`UPDATE academy_enrollments SET status='cancelled' WHERE id=$1`, [enrollment.id]);
        return { success: true as const };
      });
    },
  };
}

import type { AcademyCommandResult, AcademyMemberActor } from '@pharmacy/contracts/academy';
import type { StaffActor } from '../access/service';
import type { QueryClient } from '../../db/client';
import type { AcademyDependencies } from './public';
import { AcademyError } from './public';
import { executeAcademyCommand, parseCommandKey } from './commands';

async function activateEnrollment(tx: QueryClient, courseId: number, license: string, displayName: string | null) {
  const created = (await tx.query(
    `INSERT INTO academy_enrollments(course_id,pharmacist_license,display_name,status)
     VALUES($1,$2,$3,'active')
     ON CONFLICT (pharmacist_license, course_id)
     DO UPDATE SET status='active', display_name=COALESCE(EXCLUDED.display_name, academy_enrollments.display_name)
     RETURNING id`,
    [courseId, license, displayName || license],
  )).rows[0]!;
  return Number(created.id);
}

export function createOrderService(deps: AcademyDependencies) {
  return {
    async placeMockOrder(actor: AcademyMemberActor, courseId: number, key: string): Promise<AcademyCommandResult> {
      return executeAcademyCommand(deps.db, { kind: 'pharmacy-mock', id: actor.subject }, 'place-order', parseCommandKey(key), { courseId }, async tx => {
        const course = (await tx.query(
          `SELECT id,price FROM academy_courses WHERE id=$1 AND status='published' FOR UPDATE`,
          [courseId],
        )).rows[0];
        if (!course) throw new AcademyError(404, 'ไม่พบคอร์ส');
        if (Number(course.price) <= 0) throw new AcademyError(400, 'คอร์สนี้เรียนฟรี ไม่ต้องแจ้งชำระ');
        const enrolled = (await tx.query(
          `SELECT id FROM academy_enrollments WHERE course_id=$1 AND pharmacist_license=$2 AND status='active'`,
          [courseId, actor.pharmacistLicense],
        )).rows[0];
        if (enrolled) throw new AcademyError(400, 'ลงทะเบียนคอร์สนี้แล้ว');
        const pending = (await tx.query(
          `SELECT id FROM academy_orders WHERE course_id=$1 AND pharmacist_license=$2 AND status='pending' FOR UPDATE`,
          [courseId, actor.pharmacistLicense],
        )).rows[0];
        const now = deps.clock();
        const order = pending
          ? (await tx.query(
            `UPDATE academy_orders SET status='paid',reviewed_at=$1 WHERE id=$2 RETURNING id`,
            [now, pending.id],
          )).rows[0]!
          : (await tx.query(
            `INSERT INTO academy_orders(course_id,pharmacist_license,display_name,amount,status,reviewed_at)
             VALUES($1,$2,$3,$4,'paid',$5) RETURNING id`,
            [courseId, actor.pharmacistLicense, actor.displayName, course.price, now],
          )).rows[0]!;
        const enrollmentId = await activateEnrollment(tx, courseId, actor.pharmacistLicense, actor.displayName);
        return { success: true as const, orderId: Number(order.id), enrollmentId, status: 'paid' };
      });
    },

    async refundMockOrder(actor: AcademyMemberActor, courseId: number, reason: string, key: string): Promise<AcademyCommandResult> {
      const trimmed = reason.trim();
      if (!trimmed) throw new AcademyError(400, 'กรุณาระบุเหตุผล');
      return executeAcademyCommand(deps.db, { kind: 'pharmacy-mock', id: actor.subject }, 'refund-order', parseCommandKey(key), { courseId, reason: trimmed }, async tx => {
        const enrollment = (await tx.query(
          `SELECT id,progress_percent FROM academy_enrollments
           WHERE course_id=$1 AND pharmacist_license=$2 AND status='active' FOR UPDATE`,
          [courseId, actor.pharmacistLicense],
        )).rows[0];
        if (!enrollment) throw new AcademyError(404, 'ไม่พบการลงทะเบียน');
        if (Number(enrollment.progress_percent) >= 100) throw new AcademyError(400, 'เรียนจบแล้ว ขอคืนเงินไม่ได้');
        const order = (await tx.query(
          `SELECT id FROM academy_orders WHERE course_id=$1 AND pharmacist_license=$2 AND status='paid'
           ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
          [courseId, actor.pharmacistLicense],
        )).rows[0];
        if (!order) throw new AcademyError(400, 'ไม่พบรายการที่ชำระแล้ว');
        await tx.query(`INSERT INTO academy_refund_requests(order_id,reason,status) VALUES($1,$2,'approved')`, [order.id, trimmed]);
        await tx.query(`UPDATE academy_orders SET status='refunded',reviewed_at=$1 WHERE id=$2`, [deps.clock(), order.id]);
        await tx.query(`UPDATE academy_enrollments SET status='cancelled' WHERE id=$1`, [enrollment.id]);
        return { success: true as const, orderId: Number(order.id), status: 'refunded' };
      });
    },

    async reviewOrder(actor: StaffActor, id: number, decision: 'approve' | 'reject', key: string): Promise<AcademyCommandResult> {
      return executeAcademyCommand(deps.db, { kind: 'staff', id: String(actor.id) }, 'review-order', parseCommandKey(key), { id, decision }, async tx => {
        const order = (await tx.query(`SELECT * FROM academy_orders WHERE id=$1 FOR UPDATE`, [id])).rows[0];
        if (!order || order.status !== 'pending') throw new AcademyError(400, decision === 'approve' ? 'รายการนี้ยืนยันไม่ได้' : 'รายการนี้ปฏิเสธไม่ได้');
        if (decision === 'reject') {
          await tx.query(`UPDATE academy_orders SET status='rejected',reviewed_at=$1 WHERE id=$2`, [deps.clock(), id]);
          return { success: true as const, orderId: id, status: 'rejected' };
        }
        await tx.query(`UPDATE academy_orders SET status='paid',reviewed_at=$1 WHERE id=$2`, [deps.clock(), id]);
        const enrollmentId = await activateEnrollment(tx, Number(order.course_id), order.pharmacist_license as string, order.display_name as string | null);
        return { success: true as const, orderId: id, enrollmentId, status: 'paid' };
      });
    },

    async reviewRefund(actor: StaffActor, id: number, decision: 'approve' | 'reject', key: string): Promise<AcademyCommandResult> {
      return executeAcademyCommand(deps.db, { kind: 'staff', id: String(actor.id) }, 'review-refund', parseCommandKey(key), { id, decision }, async tx => {
        const refund = (await tx.query(`SELECT * FROM academy_refund_requests WHERE id=$1 FOR UPDATE`, [id])).rows[0];
        if (!refund || refund.status !== 'pending') throw new AcademyError(400, 'คำขอนี้พิจารณาไม่ได้');
        if (decision === 'reject') {
          await tx.query(`UPDATE academy_refund_requests SET status='rejected' WHERE id=$1`, [id]);
          return { success: true as const, status: 'rejected' };
        }
        const order = (await tx.query(`SELECT * FROM academy_orders WHERE id=$1 FOR UPDATE`, [refund.order_id])).rows[0];
        if (!order) throw new AcademyError(404, 'ไม่พบคำสั่งซื้อ');
        const enrollment = (await tx.query(
          `SELECT id,progress_percent FROM academy_enrollments
           WHERE course_id=$1 AND pharmacist_license=$2 AND status='active' FOR UPDATE`,
          [order.course_id, order.pharmacist_license],
        )).rows[0];
        if (enrollment && Number(enrollment.progress_percent) >= 100)
          throw new AcademyError(400, 'เรียนจบแล้ว คืนเงินไม่ได้');
        await tx.query(`UPDATE academy_refund_requests SET status='approved' WHERE id=$1`, [id]);
        await tx.query(`UPDATE academy_orders SET status='refunded',reviewed_at=$1 WHERE id=$2`, [deps.clock(), order.id]);
        if (enrollment) await tx.query(`UPDATE academy_enrollments SET status='cancelled' WHERE id=$1`, [enrollment.id]);
        return { success: true as const, orderId: Number(order.id), status: 'refunded' };
      });
    },
  };
}

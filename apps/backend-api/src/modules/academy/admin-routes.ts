import type { FastifyInstance } from 'fastify';
import {
  AcademyCommandResultSchema, AcademyCourseDetailSchema, AcademyCourseInputSchema,
  AcademyUploadIntentSchema,
} from '@pharmacy/contracts/academy';
import { UploadIntentMetadataSchema } from '@pharmacy/contracts/media';
import { CAPABILITY } from '@pharmacy/contracts/access';
import type { AcademyDependencies } from './public';
import { AcademyError } from './public';
import { listAdminCourses, loadAdminCourse } from './queries';
import { createCourseService } from './course-service';
import { createCatalogService } from './catalog-service';
import { createOrderService } from './order-service';
import { commandKeyFrom, parseAcademyId } from './http';

const ErrorSchema = {
  type: 'object', properties: { message: { type: 'string' } },
  required: ['message'], additionalProperties: false,
} as const;
const errors = {
  400: ErrorSchema, 401: ErrorSchema, 403: ErrorSchema, 404: ErrorSchema, 409: ErrorSchema,
  413: ErrorSchema, 415: ErrorSchema, 503: ErrorSchema,
} as const;
const success = { type: 'object', additionalProperties: false, required: ['success'], properties: { success: { type: 'boolean', const: true }, id: { type: 'integer' } } } as const;

export function registerAcademyAdminRoutes(app: FastifyInstance, deps: AcademyDependencies) {
  const guard = deps.access.requireCapability(CAPABILITY.MANAGE_ACADEMY);
  const courses = createCourseService(deps);
  const catalog = createCatalogService(deps);
  const orders = createOrderService(deps);

  app.get('/academy/admin/courses', { preHandler: guard }, async () => listAdminCourses(deps.db));
  app.get('/academy/admin/courses/:id', {
    preHandler: guard,
    schema: { response: { ...errors } },
  }, async (request, reply) => {
    const course = await loadAdminCourse(deps.db, parseAcademyId((request.params as { id: string }).id, 'ไม่พบคอร์ส'));
    if (!course) return reply.code(404).send({ message: 'ไม่พบคอร์ส' });
    return course;
  });
  app.post('/academy/admin/courses', {
    preHandler: guard,
    schema: { body: AcademyCourseInputSchema, response: { 200: AcademyCourseDetailSchema, ...errors } },
  }, async request => courses.saveCourse(request.staffActor!, null, request.body as never));
  app.put('/academy/admin/courses/:id', {
    preHandler: guard,
    schema: { body: AcademyCourseInputSchema, response: { 200: AcademyCourseDetailSchema, ...errors } },
  }, async request => courses.saveCourse(
    request.staffActor!, parseAcademyId((request.params as { id: string }).id, 'ไม่พบคอร์ส'), request.body as never,
  ));
  app.delete('/academy/admin/courses/:id', {
    preHandler: guard,
    schema: { response: { 200: success, ...errors } },
  }, async request => courses.deleteCourse(request.staffActor!, parseAcademyId((request.params as { id: string }).id, 'ไม่พบคอร์ส')));

  app.get('/academy/admin/categories', { preHandler: guard }, async () =>
    (await deps.db.query(`SELECT * FROM academy_categories ORDER BY sort_order ASC, id ASC`)).rows);
  app.post('/academy/admin/categories', { preHandler: guard, schema: { response: { 200: success, ...errors } } },
    async request => catalog.saveCategory(request.staffActor!, null, (request.body ?? {}) as Record<string, unknown>));
  app.put('/academy/admin/categories/:id', { preHandler: guard, schema: { response: { 200: success, ...errors } } },
    async request => catalog.saveCategory(request.staffActor!, parseAcademyId((request.params as { id: string }).id, 'ไม่พบหมวดหมู่'), (request.body ?? {}) as Record<string, unknown>));
  app.delete('/academy/admin/categories/:id', { preHandler: guard, schema: { response: { 200: success, ...errors } } },
    async request => catalog.deleteCategory(request.staffActor!, parseAcademyId((request.params as { id: string }).id, 'ไม่พบหมวดหมู่')));

  app.get('/academy/admin/instructors', { preHandler: guard }, async () =>
    (await deps.db.query(`SELECT * FROM academy_instructors ORDER BY sort_order ASC, id ASC`)).rows);
  app.post('/academy/admin/instructors', { preHandler: guard, schema: { response: { 200: success, ...errors } } },
    async request => catalog.saveInstructor(request.staffActor!, null, (request.body ?? {}) as Record<string, unknown>));
  app.put('/academy/admin/instructors/:id', { preHandler: guard, schema: { response: { 200: success, ...errors } } },
    async request => catalog.saveInstructor(request.staffActor!, parseAcademyId((request.params as { id: string }).id, 'ไม่พบวิทยากร'), (request.body ?? {}) as Record<string, unknown>));
  app.delete('/academy/admin/instructors/:id', { preHandler: guard, schema: { response: { 200: success, ...errors } } },
    async request => catalog.deleteInstructor(request.staffActor!, parseAcademyId((request.params as { id: string }).id, 'ไม่พบวิทยากร')));

  app.get('/academy/admin/reviews', { preHandler: guard }, async () =>
    (await deps.db.query(`SELECT * FROM academy_reviews ORDER BY created_at DESC NULLS LAST, id DESC`)).rows);
  app.post('/academy/admin/reviews', { preHandler: guard, schema: { response: { 200: success, ...errors } } },
    async request => catalog.saveReview(request.staffActor!, (request.body ?? {}) as Record<string, unknown>));
  app.delete('/academy/admin/reviews/:id', { preHandler: guard, schema: { response: { 200: success, ...errors } } },
    async request => catalog.deleteReview(request.staffActor!, parseAcademyId((request.params as { id: string }).id, 'ไม่พบรีวิว')));

  app.get('/academy/admin/enrollments', { preHandler: guard }, async () =>
    (await deps.db.query(`SELECT * FROM academy_enrollments ORDER BY enrolled_at DESC NULLS LAST, id DESC`)).rows);
  app.get('/academy/admin/orders', { preHandler: guard }, async () =>
    (await deps.db.query(`SELECT * FROM academy_orders ORDER BY created_at DESC NULLS LAST, id DESC`)).rows);
  app.get('/academy/admin/refunds', { preHandler: guard }, async () =>
    (await deps.db.query(`SELECT * FROM academy_refund_requests ORDER BY created_at DESC NULLS LAST, id DESC`)).rows);
  app.get('/academy/admin/cpe', { preHandler: guard }, async () =>
    (await deps.db.query(
      `SELECT e.pharmacist_license, e.display_name, c.title, c.cpe_credits, e.progress_percent
       FROM academy_enrollments e INNER JOIN academy_courses c ON c.id = e.course_id
       WHERE e.status='active' AND e.exam_passed=true ORDER BY e.id DESC`,
    )).rows);

  app.post('/academy/admin/orders/:id/approve', {
    preHandler: guard, schema: { response: { 200: AcademyCommandResultSchema, ...errors } },
  }, async request => orders.reviewOrder(request.staffActor!, parseAcademyId((request.params as { id: string }).id), 'approve', commandKeyFrom(request.headers)));
  app.post('/academy/admin/orders/:id/reject', {
    preHandler: guard, schema: { response: { 200: AcademyCommandResultSchema, ...errors } },
  }, async request => orders.reviewOrder(request.staffActor!, parseAcademyId((request.params as { id: string }).id), 'reject', commandKeyFrom(request.headers)));
  app.post('/academy/admin/refunds/:id/approve', {
    preHandler: guard, schema: { response: { 200: AcademyCommandResultSchema, ...errors } },
  }, async request => orders.reviewRefund(request.staffActor!, parseAcademyId((request.params as { id: string }).id), 'approve', commandKeyFrom(request.headers)));
  app.post('/academy/admin/refunds/:id/reject', {
    preHandler: guard, schema: { response: { 200: AcademyCommandResultSchema, ...errors } },
  }, async request => orders.reviewRefund(request.staffActor!, parseAcademyId((request.params as { id: string }).id), 'reject', commandKeyFrom(request.headers)));

  app.post('/academy/admin/upload-cover', {
    preHandler: guard,
    schema: { body: UploadIntentMetadataSchema, response: { 200: AcademyUploadIntentSchema, ...errors } },
  }, async request => {
    if (!deps.uploads) throw new AcademyError(503, 'Academy media operations temporarily unavailable');
    const actor = request.staffActor!;
    return deps.uploads.createUploadIntent({
      verifiedActor: {
        kind: 'staff', actorKey: `staff:${actor.id}`, userId: actor.id, sessionId: actor.sessionId,
        requiredCapability: CAPABILITY.MANAGE_ACADEMY,
      },
      owner: { domain: 'academy', type: 'course', id: 'draft', slot: 'cover' },
      kind: 'website-image',
      metadata: request.body as { filename: string; declaredMime: string; size: number },
    });
  });
  app.post('/academy/admin/upload-document', {
    preHandler: guard,
    schema: { body: UploadIntentMetadataSchema, response: { 200: AcademyUploadIntentSchema, ...errors } },
  }, async request => {
    if (!deps.uploads) throw new AcademyError(503, 'Academy media operations temporarily unavailable');
    const actor = request.staffActor!;
    return deps.uploads.createUploadIntent({
      verifiedActor: {
        kind: 'staff', actorKey: `staff:${actor.id}`, userId: actor.id, sessionId: actor.sessionId,
        requiredCapability: CAPABILITY.MANAGE_ACADEMY,
      },
      owner: { domain: 'academy', type: 'course', id: 'draft', slot: 'document' },
      kind: 'academy-document',
      metadata: request.body as { filename: string; declaredMime: string; size: number },
    });
  });
}
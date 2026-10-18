import type { FastifyInstance } from 'fastify';
import { AcademyCourseDetailSchema, AcademyCourseSchema } from '@pharmacy/contracts/academy';
import type { AcademyDependencies } from './public';
import { AcademyError } from './public';
import { listPublishedCourses, readPublishedCourse } from './queries';

const array = (items: object) => ({ type: 'array', items });

export function registerAcademyPublicRoutes(app: FastifyInstance, deps: AcademyDependencies) {
  app.get('/academy/categories', async () => {
    const categories = (await deps.db.query(
      `SELECT id, name, description, image_url, color FROM academy_categories
       WHERE is_visible = true ORDER BY sort_order ASC, id ASC`,
    )).rows;
    const counts = (await deps.db.query(
      `SELECT category_id, count(id)::int AS total FROM academy_courses
       WHERE status='published' GROUP BY category_id`,
    )).rows;
    const countMap = new Map(counts.map(row => [Number(row.category_id), Number(row.total)]));
    return categories.map(row => ({
      id: Number(row.id),
      name: row.name as string,
      description: (row.description as string | null) ?? null,
      imageUrl: (row.image_url as string | null) ?? null,
      color: (row.color as string | null) ?? null,
      courseCount: countMap.get(Number(row.id)) ?? 0,
    }));
  });

  app.get('/academy/instructors', async () => {
    const rows = (await deps.db.query(
      `SELECT id, name, title, expertise, image_url FROM academy_instructors
       WHERE is_visible = true ORDER BY sort_order ASC, id ASC`,
    )).rows;
    return rows.map(row => ({
      id: Number(row.id),
      name: row.name as string,
      title: (row.title as string | null) ?? null,
      expertise: (row.expertise as string | null) ?? null,
      imageUrl: (row.image_url as string | null) ?? null,
    }));
  });

  app.get('/academy/reviews', async () => {
    const rows = (await deps.db.query(
      `SELECT r.id, r.rating, r.body, r.reviewer_name, r.reviewer_role, c.title AS course_title
       FROM academy_reviews r INNER JOIN academy_courses c ON c.id = r.course_id
       ORDER BY r.created_at DESC NULLS LAST, r.id DESC`,
    )).rows;
    return rows.map(row => ({
      id: Number(row.id),
      rating: Number(row.rating),
      body: row.body as string,
      reviewerName: row.reviewer_name as string,
      reviewerRole: (row.reviewer_role as string | null) ?? null,
      courseTitle: row.course_title as string,
    }));
  });

  app.get('/academy/stats', async () => {
    const courses = (await deps.db.query(`SELECT count(*)::int AS total FROM academy_courses WHERE status='published'`)).rows[0];
    const learners = (await deps.db.query(`SELECT count(DISTINCT pharmacist_license)::int AS total FROM academy_enrollments WHERE status='active'`)).rows[0];
    const instructors = (await deps.db.query(`SELECT count(*)::int AS total FROM academy_instructors WHERE is_visible=true`)).rows[0];
    return {
      courseCount: Number(courses?.total ?? 0),
      learnerCount: Number(learners?.total ?? 0),
      instructorCount: Number(instructors?.total ?? 0),
    };
  });

  app.get('/academy/courses', { schema: { response: { 200: array(AcademyCourseSchema) } } }, async request =>
    listPublishedCourses(deps.db, request.query as { category?: string; q?: string; featured?: string }));

  app.get('/academy/courses/:id', {
    schema: {
      response: {
        200: AcademyCourseDetailSchema,
        404: { type: 'object', properties: { message: { type: 'string' } }, additionalProperties: false },
      },
    },
  }, async (request, reply) => {
    const id = Number((request.params as { id: string }).id);
    if (!Number.isSafeInteger(id) || id < 1) throw new AcademyError(400, 'ไม่พบคอร์ส');
    const course = await readPublishedCourse(deps.db, id);
    if (!course) return reply.code(404).send({ message: 'ไม่พบคอร์ส' });
    return course;
  });
}

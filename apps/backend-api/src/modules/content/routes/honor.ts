import { createRichTextSanitizer } from '../rich-text';
import type { FastifyInstance } from 'fastify';
import { CAPABILITY } from '@pharmacy/contracts/access';
import { HonorAdminSummarySchema, HonorAdminDetailSchema, pageSchema, type HonorAdminSummary, type HonorAdminDetail, type Page } from '@pharmacy/contracts/content';
import type { ContentDependencies } from '../public';
import { parseContentQuery } from '../route-manifest';
import { readClauses, readDetailId, jsonTimestamp } from './read-query';
import { orderArraySchema, successSchema, notFoundSchema, type OrderItem } from './write-input';
import { honorWrite, registerJsonRecordWrites } from './record-writes';

const summaryFields = `id, award_id, "order", prefix, name, award_name, work_name, award_detail, image_url, video_url, created_at AT TIME ZONE 'UTC' AS created_at`;
const detailFields = `${summaryFields}, full_detail, original_image_url`;
function summary(row: Record<string, unknown>): HonorAdminSummary {
  return { id: row.id as number,
    awardId: row.award_id as number,
    order: row.order as number,
    prefix: row.prefix as string | null,
    name: row.name as string,
    awardName: row.award_name as string | null,
    workName: row.work_name as string | null,
    awardDetail: row.award_detail as string | null,
    imageUrl: row.image_url as string | null,
    videoUrl: row.video_url as string | null,
    createdAt: jsonTimestamp(row.created_at) };
}
function detail(row: Record<string, unknown>, sanitize: (html: string) => string): HonorAdminDetail {
  return { ...summary(row),
    fullDetail: row.full_detail === null ? null : sanitize(row.full_detail as string),
    originalImageUrl: row.original_image_url as string | null };
}

export function registerHonorRoutes(app: FastifyInstance, deps: ContentDependencies) {
  const { db, access, config } = deps;
  const sanitize = createRichTextSanitizer(config?.contentImageSources ?? []);
  const guard = access.requireCapability(CAPABILITY.MANAGE_ABOUT);
  app.get('/api/admin/content/honor', { onRequest: guard, schema: { response: { 200: pageSchema(HonorAdminSummarySchema) } } }, async (request): Promise<Page<HonorAdminSummary>> => {
    const query = parseContentQuery('honor', request.query);
    const { where, order, values, pagination } = readClauses(query);
    const count = await db.query(`SELECT count(*) AS total FROM honors${where}`, values);
    const rows = await db.query(`SELECT ${summaryFields} FROM honors${where}${order}${pagination}`, [...values, query.pageSize, query.offset]);
    return { items: rows.rows.map(summary), total: Number(count.rows[0]!.total), page: query.page, pageSize: query.pageSize };
  });
  app.get('/api/admin/content/honor/:id', { onRequest: guard, schema: { response: { 200: HonorAdminDetailSchema, 404: notFoundSchema } } }, async (request, reply) => {
    const id = readDetailId(request);
    const row = (await db.query(`SELECT ${detailFields} FROM honors WHERE id=$1`, [id])).rows[0];
    if (!row) return reply.code(404).send({ message: 'Content not found' });
    return detail(row,sanitize);
  });
  for (const url of ['/api/admin/content/honor', '/api/honor']) {
    app.put(`${url}/reorder`, { onRequest: guard, schema: { body: orderArraySchema, response: { 200: successSchema } } }, async request => {
      const items = request.body as OrderItem[];
      await db.withTransaction(async tx => {
        for (const item of items) await tx.query('UPDATE honors SET "order"=$1 WHERE id=$2', [item.order, item.id]);
      });
      return { success: true };
    });
  }
  registerJsonRecordWrites(app, deps, honorWrite);
}

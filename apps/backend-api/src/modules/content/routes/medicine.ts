import { createRichTextSanitizer } from '../rich-text';
import type { FastifyInstance } from 'fastify';
import { CAPABILITY } from '@pharmacy/contracts/access';
import { MedicineAdminSummarySchema, MedicineAdminDetailSchema, pageSchema, type MedicineAdminSummary, type MedicineAdminDetail, type Page } from '@pharmacy/contracts/content';
import type { ContentDependencies } from '../public';
import { parseContentQuery } from '../route-manifest';
import { readClauses, readDetailId, jsonTimestamp } from './read-query';
import { registerJsonFamilyWrites } from './article-writes';

// Preserve the legacy Drizzle UTC interpretation before pg decodes zone-free timestamps.
const summaryFields = `id, title, excerpt, thumbnail_url, category, status, created_at AT TIME ZONE 'UTC' AS created_at, updated_at AT TIME ZONE 'UTC' AS updated_at, published_at AT TIME ZONE 'UTC' AS published_at`;
function summary(row: Record<string, unknown>): MedicineAdminSummary {
  return { id: row.id as number, title: row.title as string, excerpt: row.excerpt as string | null,
    thumbnailUrl: row.thumbnail_url as string | null, category: row.category as MedicineAdminSummary['category'],
    status: row.status as MedicineAdminSummary['status'], createdAt: jsonTimestamp(row.created_at),
    updatedAt: jsonTimestamp(row.updated_at), publishedAt: jsonTimestamp(row.published_at),
  };
}
function detail(row: Record<string, unknown>, sanitize: (html: string) => string): MedicineAdminDetail {
  return { ...summary(row), content: sanitize(row.content as string) };
}

export function registerMedicineRoutes(app: FastifyInstance, deps: ContentDependencies) {
  const { db, access, config } = deps;
  const sanitize = createRichTextSanitizer(config?.contentImageSources ?? []);
  const guard = access.requireCapability(CAPABILITY.MANAGE_NEWS);
  app.get('/api/admin/content/medicine', { onRequest: guard, schema: { response: { 200: pageSchema(MedicineAdminSummarySchema) } } }, async (request): Promise<Page<MedicineAdminSummary>> => {
    const query = parseContentQuery('medicine', request.query);
    const { where, order, values, pagination } = readClauses(query);
    const count = await db.query(`SELECT count(*) AS total FROM medicine_articles${where}`, values);
    const rows = await db.query(`SELECT ${summaryFields} FROM medicine_articles${where}${order}${pagination}`, [...values, query.pageSize, query.offset]);
    return { items: rows.rows.map(summary), total: Number(count.rows[0]!.total), page: query.page, pageSize: query.pageSize };
  });
  app.get('/api/admin/content/medicine/:id', { onRequest: guard, schema: { response: { 200: MedicineAdminDetailSchema, 404: { type: 'object', properties: { message: { type: 'string' } }, required: ['message'], additionalProperties: false } } } }, async (request, reply) => {
    const id = readDetailId(request);
    const row = (await db.query(`SELECT ${summaryFields}, content FROM medicine_articles WHERE id=$1`, [id])).rows[0];
    if (!row) return reply.code(404).send({ message: 'Content not found' });
    return detail(row,sanitize);
  });
  registerJsonFamilyWrites(app, deps, 'medicine');
}

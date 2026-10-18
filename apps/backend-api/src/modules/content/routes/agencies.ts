import type { FastifyInstance } from 'fastify';
import { CAPABILITY } from '@pharmacy/contracts/access';
import { AgencyAdminSummarySchema, AgencyAdminDetailSchema, pageSchema, type AgencyAdminSummary, type AgencyAdminDetail, type Page } from '@pharmacy/contracts/content';
import type { ContentDependencies } from '../public';
import { parseContentQuery } from '../route-manifest';
import { readClauses, readDetailId, jsonTimestamp } from './read-query';
import { orderArraySchema, successSchema, notFoundSchema, type OrderItem } from './write-input';
import { agencyWrite, registerJsonRecordWrites } from './record-writes';

const summaryFields = `id, "order", name, title, description, thumbnail_url, logo_url, icon_url, url, category, created_at AT TIME ZONE 'UTC' AS created_at`;
const detailFields = `${summaryFields}, original_thumbnail_url`;
function summary(row: Record<string, unknown>): AgencyAdminSummary {
  return { id: row.id as number,
    order: row.order as number,
    name: row.name as string,
    title: row.title as string | null,
    description: row.description as string | null,
    thumbnailUrl: row.thumbnail_url as string | null,
    logoUrl: row.logo_url as string | null,
    iconUrl: row.icon_url as string | null,
    url: row.url as string,
    category: row.category as string,
    createdAt: jsonTimestamp(row.created_at) };
}
function detail(row: Record<string, unknown>): AgencyAdminDetail {
  return { ...summary(row), originalThumbnailUrl: row.original_thumbnail_url as string | null };
}

export function registerAgencyRoutes(app: FastifyInstance, deps: ContentDependencies) {
  const { db, access } = deps;
  const guard = access.requireCapability(CAPABILITY.MANAGE_AGENCY);
  app.get('/api/admin/content/agencies', { onRequest: guard, schema: { response: { 200: pageSchema(AgencyAdminSummarySchema) } } }, async (request): Promise<Page<AgencyAdminSummary>> => {
    const query = parseContentQuery('agencies', request.query);
    const { where, order, values, pagination } = readClauses(query);
    const count = await db.query(`SELECT count(*) AS total FROM agencies${where}`, values);
    const rows = await db.query(`SELECT ${summaryFields} FROM agencies${where}${order}${pagination}`, [...values, query.pageSize, query.offset]);
    return { items: rows.rows.map(summary), total: Number(count.rows[0]!.total), page: query.page, pageSize: query.pageSize };
  });
  app.get('/api/admin/content/agencies/:id', { onRequest: guard, schema: { response: { 200: AgencyAdminDetailSchema, 404: notFoundSchema } } }, async (request, reply) => {
    const id = readDetailId(request);
    const row = (await db.query(`SELECT ${detailFields} FROM agencies WHERE id=$1`, [id])).rows[0];
    if (!row) return reply.code(404).send({ message: 'Content not found' });
    return detail(row);
  });
  for (const url of ['/api/admin/content/agencies', '/api/agencies']) {
    app.put(`${url}/reorder`, { onRequest: guard, schema: { body: orderArraySchema, response: { 200: successSchema } } }, async request => {
      const items = request.body as OrderItem[];
      await db.withTransaction(async tx => {
        for (const item of items) await tx.query('UPDATE agencies SET "order"=$1 WHERE id=$2', [item.order, item.id]);
      });
      return { success: true };
    });
  }
  registerJsonRecordWrites(app, deps, agencyWrite);
}

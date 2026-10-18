import type { FastifyInstance } from 'fastify';
import { CAPABILITY } from '@pharmacy/contracts/access';
import { CouncilAdminSummarySchema, CouncilAdminDetailSchema, pageSchema, type CouncilAdminSummary, type CouncilAdminDetail, type Page } from '@pharmacy/contracts/content';
import type { ContentDependencies } from '../public';
import { parseContentQuery } from '../route-manifest';
import { readClauses, readDetailId } from './read-query';
import { orderArraySchema, successSchema, notFoundSchema, type OrderItem } from './write-input';
import { councilWrite, registerJsonRecordWrites } from './record-writes';

const summaryFields = `id, prefix, name, position, type, image_url, "order", background`;
const detailFields = `${summaryFields}, original_image_url`;
function summary(row: Record<string, unknown>): CouncilAdminSummary {
  return { id: row.id as number,
    prefix: row.prefix as string | null,
    name: row.name as string,
    position: row.position as string,
    type: row.type as string,
    imageUrl: row.image_url as string | null,
    order: row.order as number,
    background: row.background as string | null };
}
function detail(row: Record<string, unknown>): CouncilAdminDetail {
  return { ...summary(row), originalImageUrl: row.original_image_url as string | null };
}

export function registerCouncilRoutes(app: FastifyInstance, deps: ContentDependencies) {
  const { db, access } = deps;
  const guard = access.requireCapability(CAPABILITY.MANAGE_ABOUT);
  app.get('/api/admin/content/council', { onRequest: guard, schema: { response: { 200: pageSchema(CouncilAdminSummarySchema) } } }, async (request): Promise<Page<CouncilAdminSummary>> => {
    const query = parseContentQuery('council', request.query);
    const { where, order, values, pagination } = readClauses(query);
    const count = await db.query(`SELECT count(*) AS total FROM council_members${where}`, values);
    const rows = await db.query(`SELECT ${summaryFields} FROM council_members${where}${order}${pagination}`, [...values, query.pageSize, query.offset]);
    return { items: rows.rows.map(summary), total: Number(count.rows[0]!.total), page: query.page, pageSize: query.pageSize };
  });
  app.get('/api/admin/content/council/:id', { onRequest: guard, schema: { response: { 200: CouncilAdminDetailSchema, 404: notFoundSchema } } }, async (request, reply) => {
    const id = readDetailId(request);
    const row = (await db.query(`SELECT ${detailFields} FROM council_members WHERE id=$1`, [id])).rows[0];
    if (!row) return reply.code(404).send({ message: 'Content not found' });
    return detail(row);
  });
  for (const url of ['/api/admin/content/council', '/api/council']) {
    app.put(`${url}/reorder`, { onRequest: guard, schema: { body: orderArraySchema, response: { 200: successSchema } } }, async request => {
      const items = request.body as OrderItem[];
      await db.withTransaction(async tx => {
        for (const item of items) await tx.query('UPDATE council_members SET "order"=$1 WHERE id=$2', [item.order, item.id]);
      });
      return { success: true };
    });
  }
  registerJsonRecordWrites(app, deps, councilWrite);
}

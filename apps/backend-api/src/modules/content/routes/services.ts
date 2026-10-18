import type { FastifyInstance } from 'fastify';
import { CAPABILITY } from '@pharmacy/contracts/access';
import { ServiceAdminSummarySchema, ServiceAdminDetailSchema, pageSchema, type ServiceAdminSummary, type ServiceAdminDetail, type Page } from '@pharmacy/contracts/content';
import type { ContentDependencies } from '../public';
import { parseContentQuery } from '../route-manifest';
import { readClauses, readDetailId, jsonTimestamp } from './read-query';
import { orderArraySchema, successSchema, notFoundSchema, type OrderItem } from './write-input';
import { registerJsonRecordWrites, serviceWrite } from './record-writes';

const summaryFields = `id, name, short_name, icon_url, "order", description, link_url, is_popular, popular_order, created_at AT TIME ZONE 'UTC' AS created_at`;
const detailFields = summaryFields;
function summary(row: Record<string, unknown>): ServiceAdminSummary {
  return { id: row.id as number,
    name: row.name as string,
    shortName: row.short_name as string | null,
    iconUrl: row.icon_url as string | null,
    order: row.order as number,
    description: row.description as string | null,
    linkUrl: row.link_url as string | null,
    isPopular: row.is_popular as boolean | null,
    popularOrder: row.popular_order as number | null,
    createdAt: jsonTimestamp(row.created_at) };
}
function detail(row: Record<string, unknown>): ServiceAdminDetail {
  return summary(row);
}

export function registerServiceRoutes(app: FastifyInstance, deps: ContentDependencies) {
  const { db, access } = deps;
  const guard = access.requireCapability(CAPABILITY.MANAGE_SERVICE);
  app.get('/api/admin/content/services', { onRequest: guard, schema: { response: { 200: pageSchema(ServiceAdminSummarySchema) } } }, async (request): Promise<Page<ServiceAdminSummary>> => {
    const query = parseContentQuery('services', request.query);
    const { where, order, values, pagination } = readClauses(query);
    const count = await db.query(`SELECT count(*) AS total FROM services${where}`, values);
    const rows = await db.query(`SELECT ${summaryFields} FROM services${where}${order}${pagination}`, [...values, query.pageSize, query.offset]);
    return { items: rows.rows.map(summary), total: Number(count.rows[0]!.total), page: query.page, pageSize: query.pageSize };
  });
  app.get('/api/admin/content/services/:id', { onRequest: guard, schema: { response: { 200: ServiceAdminDetailSchema, 404: notFoundSchema } } }, async (request, reply) => {
    const id = readDetailId(request);
    const row = (await db.query(`SELECT ${detailFields} FROM services WHERE id=$1`, [id])).rows[0];
    if (!row) return reply.code(404).send({ message: 'Content not found' });
    return detail(row);
  });
  for (const url of ['/api/admin/content/services', '/api/services']) {
    app.put(`${url}/reorder`, { onRequest: guard, schema: { body: orderArraySchema, response: { 200: successSchema } } }, async request => {
      const items = request.body as OrderItem[];
      await db.withTransaction(async tx => {
        for (const item of items) await tx.query('UPDATE services SET "order"=$1 WHERE id=$2', [item.order, item.id]);
      });
      return { success: true };
    });
  }
  registerJsonRecordWrites(app, deps, serviceWrite);
}

import type { FastifyInstance } from 'fastify';
import { CAPABILITY } from '@pharmacy/contracts/access';
import { LawAdminSummarySchema, LawAdminDetailSchema, pageSchema, type LawAdminSummary, type Page } from '@pharmacy/contracts/content';
import type { ContentDependencies } from '../public';
import { parseContentQuery } from '../route-manifest';
import { readClauses, readDetailId, jsonTimestamp } from './read-query';
import { orderObjectSchema, successSchema, notFoundSchema, type OrderItem } from './write-input';
import { lawWrite, registerJsonRecordWrites } from './record-writes';

// Cast the SQL date before pg can convert it using the host timezone.
const fields = `id, category, title, year, announced_at::text AS announced_at, "order", pdf_url, status, created_at AT TIME ZONE 'UTC' AS created_at`;
function summary(row: Record<string, unknown>): LawAdminSummary {
  return { id: row.id as number, category: row.category as string, title: row.title as string,
    year: row.year as number | null, announcedAt: row.announced_at as string | null, order: row.order as number | null,
    pdfUrl: row.pdf_url as string | null, status: row.status as string | null, createdAt: jsonTimestamp(row.created_at) };
}

export function registerLawRoutes(app: FastifyInstance, deps: ContentDependencies) {
  const { db, access } = deps;
  const guard = access.requireCapability(CAPABILITY.MANAGE_LAW);
  app.get('/api/admin/content/laws', { onRequest: guard, schema: { response: { 200: pageSchema(LawAdminSummarySchema) } } }, async (request): Promise<Page<LawAdminSummary>> => {
    const query = parseContentQuery('laws', request.query);
    const { where, order, values, pagination } = readClauses(query);
    const count = await db.query(`SELECT count(*) AS total FROM laws${where}`, values);
    const rows = await db.query(`SELECT ${fields} FROM laws${where}${order}${pagination}`, [...values, query.pageSize, query.offset]);
    return { items: rows.rows.map(summary), total: Number(count.rows[0]!.total), page: query.page, pageSize: query.pageSize };
  });
  app.get('/api/admin/content/laws/:id', { onRequest: guard, schema: { response: { 200: LawAdminDetailSchema, 404: notFoundSchema } } }, async (request, reply) => {
    const id = readDetailId(request);
    const row = (await db.query(`SELECT ${fields} FROM laws WHERE id=$1`, [id])).rows[0];
    if (!row) return reply.code(404).send({ message: 'Content not found' });
    return summary(row);
  });
  for (const url of ['/api/admin/content/laws','/api/laws']) {
    app.put(`${url}/reorder`, { onRequest: guard, schema: { body: orderObjectSchema, response: { 200: successSchema } } }, async request => {
      const { items } = request.body as { items: OrderItem[] };
      await db.withTransaction(async tx => {
        for (const item of items) await tx.query('UPDATE laws SET "order"=$1 WHERE id=$2', [item.order, item.id]);
      });
      return { success: true };
    });
  }
  registerJsonRecordWrites(app, deps, lawWrite);
}

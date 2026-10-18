import type { FastifyInstance } from 'fastify';
import { CAPABILITY } from '@pharmacy/contracts/access';
import { HistoryAdminSummarySchema, HistoryAdminDetailSchema, pageSchema, type HistoryAdminSummary, type HistoryAdminDetail, type Page } from '@pharmacy/contracts/content';
import type { ContentDependencies } from '../public';
import { parseContentQuery } from '../route-manifest';
import { readClauses, readDetailId, jsonTimestamp } from './read-query';
import { notFoundSchema } from './write-input';
import { historyWrite, registerJsonRecordWrites } from './record-writes';

const summaryFields = `id, term, start_year, end_year, president_name, secretary_name, president_image, secretary_image, created_at AT TIME ZONE 'UTC' AS created_at`;
const detailFields = `${summaryFields}, original_president_image, original_secretary_image`;
function summary(row: Record<string, unknown>): HistoryAdminSummary {
  return { id: row.id as number,
    term: row.term as string,
    startYear: row.start_year as string,
    endYear: row.end_year as string,
    presidentName: row.president_name as string,
    secretaryName: row.secretary_name as string,
    presidentImage: row.president_image as string | null,
    secretaryImage: row.secretary_image as string | null,
    createdAt: jsonTimestamp(row.created_at) };
}
function detail(row: Record<string, unknown>): HistoryAdminDetail {
  return { ...summary(row), originalPresidentImage: row.original_president_image as string | null,
    originalSecretaryImage: row.original_secretary_image as string | null };
}

export function registerHistoryRoutes(app: FastifyInstance, deps: ContentDependencies) {
  const { db, access } = deps;
  const guard = access.requireCapability(CAPABILITY.MANAGE_ABOUT);
  app.get('/api/admin/content/history', { onRequest: guard, schema: { response: { 200: pageSchema(HistoryAdminSummarySchema) } } }, async (request): Promise<Page<HistoryAdminSummary>> => {
    const query = parseContentQuery('history', request.query);
    const { where, order, values, pagination } = readClauses(query);
    const count = await db.query(`SELECT count(*) AS total FROM council_history${where}`, values);
    const rows = await db.query(`SELECT ${summaryFields} FROM council_history${where}${order}${pagination}`, [...values, query.pageSize, query.offset]);
    return { items: rows.rows.map(summary), total: Number(count.rows[0]!.total), page: query.page, pageSize: query.pageSize };
  });
  app.get('/api/admin/content/history/:id', { onRequest: guard, schema: { response: { 200: HistoryAdminDetailSchema, 404: notFoundSchema } } }, async (request, reply) => {
    const id = readDetailId(request);
    const row = (await db.query(`SELECT ${detailFields} FROM council_history WHERE id=$1`, [id])).rows[0];
    if (!row) return reply.code(404).send({ message: 'Content not found' });
    return detail(row);
  });
  registerJsonRecordWrites(app, deps, historyWrite);
}

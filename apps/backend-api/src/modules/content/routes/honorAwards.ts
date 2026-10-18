import type { FastifyInstance } from 'fastify';
import { CAPABILITY } from '@pharmacy/contracts/access';
import { HonorAwardAdminSummarySchema, HonorAwardAdminDetailSchema, contentId, contentText, contentInteger, contentTimestamp, contentNullable, pageSchema,
  type HonorAwardAdminSummary, type HonorAwardAdminDetail, type Page } from '@pharmacy/contracts/content';
import type { ContentDependencies } from '../public';
import { parseContentQuery, ContentQueryError } from '../route-manifest';
import { readClauses, readDetailId, jsonTimestamp } from './read-query';
import { orderArraySchema, successSchema, notFoundSchema, type OrderItem } from './write-input';
import { registerCascadeDeletes } from './record-writes';

const awardFields = `id, "order", name, description, created_at AT TIME ZONE 'UTC' AS created_at`;
const countFields = `${awardFields}, (SELECT count(*) FROM honors WHERE award_id=honor_awards.id) AS recipient_count`;
function award(row: Record<string, unknown>) {
  return { id: row.id as number, order: row.order as number, name: row.name as string,
    description: row.description as string | null, createdAt: jsonTimestamp(row.created_at) };
}
function summary(row: Record<string, unknown>): HonorAwardAdminSummary {
  return { ...award(row), recipientCount: Number(row.recipient_count) };
}
function detail(row: Record<string, unknown>): HonorAwardAdminDetail {
  return summary(row);
}
const createSchema = { type: 'object', additionalProperties: false, required: ['name'], properties: {
  name: contentText, description: contentNullable(contentText), order: contentInteger,
} } as const;
const updateSchema = { type: 'object', additionalProperties: false, properties: { name: contentText, description: contentNullable(contentText) } } as const;
// Mutation envelope follows the original operation; recipientCount belongs to GET DTOs.
const createdSchema = { type: 'object', additionalProperties: false, required: ['success','data'], properties: {
  success: { const: true }, data: { type: 'object', additionalProperties: false, required: ['id','order','name','description','createdAt'], properties: {
    id: contentId, order: contentInteger, name: contentText, description: contentNullable(contentText), createdAt: contentNullable(contentTimestamp),
  } },
} } as const;

export function registerHonorAwardRoutes(app: FastifyInstance, deps: ContentDependencies) {
  const { db, access, clock } = deps;
  const guard = access.requireCapability(CAPABILITY.MANAGE_ABOUT);
  app.get('/api/admin/content/honor-awards', { onRequest: guard, schema: { response: { 200: pageSchema(HonorAwardAdminSummarySchema) } } }, async (request): Promise<Page<HonorAwardAdminSummary>> => {
    const query = parseContentQuery('honor-awards', request.query);
    const { where, order, values, pagination } = readClauses(query);
    const count = await db.query(`SELECT count(*) AS total FROM honor_awards${where}`, values);
    const rows = await db.query(`SELECT ${countFields} FROM honor_awards${where}${order}${pagination}`, [...values, query.pageSize, query.offset]);
    return { items: rows.rows.map(summary), total: Number(count.rows[0]!.total), page: query.page, pageSize: query.pageSize };
  });
  app.get('/api/admin/content/honor-awards/:id', { onRequest: guard, schema: { response: { 200: HonorAwardAdminDetailSchema, 404: notFoundSchema } } }, async (request, reply) => {
    const id = readDetailId(request);
    const row = (await db.query(`SELECT ${countFields} FROM honor_awards WHERE id=$1`, [id])).rows[0];
    if (!row) return reply.code(404).send({ message: 'Content not found' });
    return detail(row);
  });
  for (const url of ['/api/admin/content/honor-awards', '/api/honor-awards']) {
    app.post(url, { onRequest: guard, schema: { body: createSchema, response: { 200: createdSchema } } }, async request => {
      const body = request.body as { name: string; description?: string | null; order?: number };
      const name = body.name.trim();
      if (!name) throw new ContentQueryError('Name is required');
      const row = await db.withTransaction(async tx => {
        let order = body.order;
        if (!order) order = Number((await tx.query('SELECT COALESCE(MAX("order"),0)+1 AS next_order FROM honor_awards')).rows[0]!.next_order);
        // pg Date binding is host-relative for zone-free storage; bind the clock as UTC text.
        return (await tx.query(`INSERT INTO honor_awards(name,description,"order",created_at) VALUES($1,$2,$3,$4) RETURNING ${awardFields}, description`,
          [name, body.description?.trim() || null, order, clock().toISOString()])).rows[0]!;
      });
      return { success: true, data: { ...award(row), description: row.description as string | null } };
    });
    app.put(`${url}/reorder`, { onRequest: guard, schema: { body: orderArraySchema, response: { 200: successSchema } } }, async request => {
      const items = request.body as OrderItem[];
      await db.withTransaction(async tx => {
        for (const item of items) await tx.query('UPDATE honor_awards SET "order"=$1 WHERE id=$2', [item.order, item.id]);
      });
      return { success: true };
    });
    app.put(`${url}/:id`, { onRequest: guard, schema: { body: updateSchema, response: { 200: successSchema, 404: notFoundSchema } } }, async (request, reply) => {
      const id = readDetailId(request);
      const body = request.body as { name?: string; description?: string | null };
      const found = await db.withTransaction(async tx => {
        const row = (await tx.query('SELECT id FROM honor_awards WHERE id=$1', [id])).rows[0];
        if (!row) return false;
        await tx.query('UPDATE honor_awards SET name=COALESCE(NULLIF($1,\'\'),name), description=CASE WHEN $2 THEN $3 ELSE description END WHERE id=$4',
          [body.name?.trim() ?? null, Object.hasOwn(body, 'description'), body.description?.trim() || null, id]);
        return true;
      });
      if (!found) return reply.code(404).send({ message: 'Content not found' });
      return { success: true };
    });
  }
  registerCascadeDeletes(app, deps, {
    family: 'honor-awards', table: 'honor_awards', capability: CAPABILITY.MANAGE_ABOUT,
    childFamily: 'honor', childTable: 'honors', childColumn: 'award_id',
  });
}

import type { FastifyInstance } from 'fastify';
import { CAPABILITY } from '@pharmacy/contracts/access';
import { OtherServiceCategoryAdminSummarySchema, OtherServiceCategoryAdminDetailSchema, OtherServiceItemAdminSummarySchema, OtherServiceItemAdminDetailSchema,
  contentId, contentText, contentInteger, contentTimestamp, contentNullable, pageSchema, type OtherServiceCategoryAdminSummary, type OtherServiceItemAdminSummary, type Page } from '@pharmacy/contracts/content';
import type { ContentDependencies } from '../public';
import { ContentQueryError, parseContentQuery } from '../route-manifest';
import { readClauses, readDetailId, jsonTimestamp } from './read-query';
import { orderObjectSchema, successSchema, notFoundSchema, type OrderItem } from './write-input';
import { otherServiceItemWrite, registerCascadeDeletes, registerJsonRecordWrites } from './record-writes';

const categoryFields = `id, name, "order", created_at AT TIME ZONE 'UTC' AS created_at`;
const categoryCountFields = `${categoryFields}, (SELECT count(*) FROM other_service_items WHERE category_id=other_service_categories.id) AS item_count`;
const itemFields = `id, category_id, name, status, pdf_url, "order", created_at AT TIME ZONE 'UTC' AS created_at`;
function category(row: Record<string, unknown>) {
  return { id: row.id as number, name: row.name as string, order: row.order as number, createdAt: jsonTimestamp(row.created_at) };
}
function categorySummary(row: Record<string, unknown>): OtherServiceCategoryAdminSummary {
  return { ...category(row), itemCount: Number(row.item_count) };
}
function item(row: Record<string, unknown>): OtherServiceItemAdminSummary {
  return { id: row.id as number, categoryId: row.category_id as number, name: row.name as string,
    status: row.status as string, pdfUrl: row.pdf_url as string | null, order: row.order as number, createdAt: jsonTimestamp(row.created_at) };
}
const categoryCreateSchema = { type: 'object', additionalProperties: false, required: ['name'], properties: { name: { type: 'string', minLength: 1 } } } as const;
const categoryUpdateSchema = { type: 'object', additionalProperties: false, properties: { name: contentText } } as const;
const categoryCreatedSchema = { type: 'object', additionalProperties: false, required: ['success','category'], properties: {
  success: { const: true }, category: { type: 'object', additionalProperties: false, required: ['id','name','order','createdAt'], properties: {
    id: contentId, name: contentText, order: contentInteger, createdAt: contentNullable(contentTimestamp),
  } },
} } as const;

export function registerOtherServiceRoutes(app: FastifyInstance, deps: ContentDependencies) {
  const { db, access, clock } = deps;
  const guard = access.requireCapability(CAPABILITY.MANAGE_OTHER_SERVICE);
  app.get('/api/admin/content/other-service-categories', { onRequest: guard, schema: { response: { 200: pageSchema(OtherServiceCategoryAdminSummarySchema) } } }, async (request): Promise<Page<OtherServiceCategoryAdminSummary>> => {
    const query = parseContentQuery('other-service-categories', request.query);
    const { where, order, values, pagination } = readClauses(query);
    const count = await db.query(`SELECT count(*) AS total FROM other_service_categories${where}`, values);
    const rows = await db.query(`SELECT ${categoryCountFields} FROM other_service_categories${where}${order}${pagination}`, [...values, query.pageSize, query.offset]);
    return { items: rows.rows.map(categorySummary), total: Number(count.rows[0]!.total), page: query.page, pageSize: query.pageSize };
  });
  app.get('/api/admin/content/other-service-categories/:id', { onRequest: guard, schema: { response: { 200: OtherServiceCategoryAdminDetailSchema, 404: notFoundSchema } } }, async (request, reply) => {
    const id = readDetailId(request);
    const row = (await db.query(`SELECT ${categoryCountFields} FROM other_service_categories WHERE id=$1`, [id])).rows[0];
    if (!row) return reply.code(404).send({ message: 'Content not found' });
    return categorySummary(row);
  });
  app.get('/api/admin/content/other-service-items', { onRequest: guard, schema: { response: { 200: pageSchema(OtherServiceItemAdminSummarySchema) } } }, async (request): Promise<Page<OtherServiceItemAdminSummary>> => {
    const query = parseContentQuery('other-service-items', request.query);
    const { where, order, values, pagination } = readClauses(query);
    const count = await db.query(`SELECT count(*) AS total FROM other_service_items${where}`, values);
    const rows = await db.query(`SELECT ${itemFields} FROM other_service_items${where}${order}${pagination}`, [...values, query.pageSize, query.offset]);
    return { items: rows.rows.map(item), total: Number(count.rows[0]!.total), page: query.page, pageSize: query.pageSize };
  });
  app.get('/api/admin/content/other-service-items/:id', { onRequest: guard, schema: { response: { 200: OtherServiceItemAdminDetailSchema, 404: notFoundSchema } } }, async (request, reply) => {
    const id = readDetailId(request);
    const row = (await db.query(`SELECT ${itemFields} FROM other_service_items WHERE id=$1`, [id])).rows[0];
    if (!row) return reply.code(404).send({ message: 'Content not found' });
    return item(row);
  });
  for (const url of ['/api/admin/content/other-service-categories','/api/other-service-categories']) {
    app.post(url, { onRequest: guard, schema: { body: categoryCreateSchema, response: { 200: categoryCreatedSchema } } }, async request => {
      const name = (request.body as { name: string }).name.trim();
      if (!name) throw new ContentQueryError('Name is required');
      const row = await db.withTransaction(async tx => {
        const order = Number((await tx.query('SELECT COALESCE(MAX("order"),-1)+1 AS next_order FROM other_service_categories')).rows[0]!.next_order);
        // pg encodes Date parameters in host time; zone-free storage needs UTC text.
        return (await tx.query(`INSERT INTO other_service_categories(name,"order",created_at) VALUES($1,$2,$3) RETURNING ${categoryFields}`, [name, order, clock().toISOString()])).rows[0]!;
      });
      return { success: true, category: category(row) };
    });
    app.put(`${url}/reorder`, { onRequest: guard, schema: { body: orderObjectSchema, response: { 200: successSchema } } }, async request => {
      const { items } = request.body as { items: OrderItem[] };
      await db.withTransaction(async tx => {
        for (const entry of items) await tx.query('UPDATE other_service_categories SET "order"=$1 WHERE id=$2', [entry.order, entry.id]);
      });
      return { success: true };
    });
    app.put(`${url}/:id`, { onRequest: guard, schema: { body: categoryUpdateSchema, response: { 200: successSchema, 404: notFoundSchema } } }, async (request, reply) => {
      const id = readDetailId(request);
      const name = (request.body as { name?: string }).name?.trim();
      const exists = await db.withTransaction(async tx => {
        const row = (await tx.query('SELECT id FROM other_service_categories WHERE id=$1 FOR UPDATE', [id])).rows[0];
        if (!row) return false;
        if (name) await tx.query('UPDATE other_service_categories SET name=$1 WHERE id=$2', [name, id]);
        return true;
      });
      if (!exists) return reply.code(404).send({ message: 'Content not found' });
      return { success: true };
    });
  }
  registerCascadeDeletes(app, deps, {
    family: 'other-service-categories', table: 'other_service_categories', capability: CAPABILITY.MANAGE_OTHER_SERVICE,
    childFamily: 'other-service-items', childTable: 'other_service_items', childColumn: 'category_id',
  });
  for (const url of ['/api/admin/content/other-service-items','/api/other-service-items']) {
    app.put(`${url}/reorder`, { onRequest: guard, schema: { body: orderObjectSchema, response: { 200: successSchema } } }, async request => {
      const { items } = request.body as { items: OrderItem[] };
      await db.withTransaction(async tx => {
        for (const entry of items) await tx.query('UPDATE other_service_items SET "order"=$1 WHERE id=$2', [entry.order, entry.id]);
      });
      return { success: true };
    });
  }
  registerJsonRecordWrites(app, deps, otherServiceItemWrite);
}

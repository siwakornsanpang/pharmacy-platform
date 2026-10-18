import type { FastifyInstance } from 'fastify';
import { CAPABILITY } from '@pharmacy/contracts/access';
import { PolicyCategoryAdminSummarySchema, PolicyCategoryAdminDetailSchema, PolicyProjectAdminSummarySchema, PolicyProjectAdminDetailSchema,
  contentId, contentText, contentInteger, contentTimestamp, contentNullable, pageSchema, type PolicyCategoryAdminSummary, type PolicyProjectAdminSummary, type Page } from '@pharmacy/contracts/content';
import type { ContentDependencies } from '../public';
import { parseContentQuery } from '../route-manifest';
import { readClauses, readDetailId, jsonTimestamp } from './read-query';
import { orderArraySchema, successSchema, notFoundSchema, type OrderItem } from './write-input';
import { policyProjectWrite, registerCascadeDeletes, registerJsonRecordWrites } from './record-writes';

const categoryFields = `id, title, "order", created_at AT TIME ZONE 'UTC' AS created_at`;
const categoryCountFields = `${categoryFields}, (SELECT count(*) FROM policy_projects WHERE category_id=policy_categories.id) AS project_count`;
const projectFields = `id, category_id, name, summary_pdf_url, status, "order", created_at AT TIME ZONE 'UTC' AS created_at`;
function category(row: Record<string, unknown>) {
  return { id: row.id as number, title: row.title as string, order: row.order as number, createdAt: jsonTimestamp(row.created_at) };
}
function categorySummary(row: Record<string, unknown>): PolicyCategoryAdminSummary {
  return { ...category(row), projectCount: Number(row.project_count) };
}
function project(row: Record<string, unknown>): PolicyProjectAdminSummary {
  return { id: row.id as number, categoryId: row.category_id as number, name: row.name as string,
    summaryPdfUrl: row.summary_pdf_url as string | null, status: row.status as string, order: row.order as number, createdAt: jsonTimestamp(row.created_at) };
}
const categoryCreateSchema = { type: 'object', additionalProperties: false, required: ['title'], properties: { title: { type: 'string', minLength: 1 }, order: contentInteger } } as const;
const categoryUpdateSchema = { type: 'object', additionalProperties: false, properties: { title: contentText, order: contentInteger } } as const;
const categoryCreatedSchema = { type: 'object', additionalProperties: false, required: ['success','data'], properties: {
  success: { const: true }, data: { type: 'object', additionalProperties: false, required: ['id','title','order','createdAt'], properties: {
    id: contentId, title: contentText, order: contentInteger, createdAt: contentNullable(contentTimestamp),
  } },
} } as const;

export function registerPolicyRoutes(app: FastifyInstance, deps: ContentDependencies) {
  const { db, access, clock } = deps;
  const guard = access.requireCapability(CAPABILITY.MANAGE_ABOUT);
  app.get('/api/admin/content/policy-categories', { onRequest: guard, schema: { response: { 200: pageSchema(PolicyCategoryAdminSummarySchema) } } }, async (request): Promise<Page<PolicyCategoryAdminSummary>> => {
    const query = parseContentQuery('policy-categories', request.query);
    const { where, order, values, pagination } = readClauses(query);
    const count = await db.query(`SELECT count(*) AS total FROM policy_categories${where}`, values);
    const rows = await db.query(`SELECT ${categoryCountFields} FROM policy_categories${where}${order}${pagination}`, [...values, query.pageSize, query.offset]);
    return { items: rows.rows.map(categorySummary), total: Number(count.rows[0]!.total), page: query.page, pageSize: query.pageSize };
  });
  app.get('/api/admin/content/policy-categories/:id', { onRequest: guard, schema: { response: { 200: PolicyCategoryAdminDetailSchema, 404: notFoundSchema } } }, async (request, reply) => {
    const id = readDetailId(request);
    const row = (await db.query(`SELECT ${categoryCountFields} FROM policy_categories WHERE id=$1`, [id])).rows[0];
    if (!row) return reply.code(404).send({ message: 'Content not found' });
    return categorySummary(row);
  });
  app.get('/api/admin/content/policy-projects', { onRequest: guard, schema: { response: { 200: pageSchema(PolicyProjectAdminSummarySchema) } } }, async (request): Promise<Page<PolicyProjectAdminSummary>> => {
    const query = parseContentQuery('policy-projects', request.query);
    const { where, order, values, pagination } = readClauses(query);
    const count = await db.query(`SELECT count(*) AS total FROM policy_projects${where}`, values);
    const rows = await db.query(`SELECT ${projectFields} FROM policy_projects${where}${order}${pagination}`, [...values, query.pageSize, query.offset]);
    return { items: rows.rows.map(project), total: Number(count.rows[0]!.total), page: query.page, pageSize: query.pageSize };
  });
  app.get('/api/admin/content/policy-projects/:id', { onRequest: guard, schema: { response: { 200: PolicyProjectAdminDetailSchema, 404: notFoundSchema } } }, async (request, reply) => {
    const id = readDetailId(request);
    const row = (await db.query(`SELECT ${projectFields} FROM policy_projects WHERE id=$1`, [id])).rows[0];
    if (!row) return reply.code(404).send({ message: 'Content not found' });
    return project(row);
  });
  for (const url of ['/api/admin/content/policy-categories','/api/policy-categories']) {
    app.post(url, { onRequest: guard, schema: { body: categoryCreateSchema, response: { 200: categoryCreatedSchema } } }, async request => {
      const body = request.body as { title: string; order?: number };
      const row = await db.withTransaction(async tx => {
        let order = body.order;
        if (!order) order = Number((await tx.query('SELECT COALESCE(MAX("order"),0)+1 AS next_order FROM policy_categories')).rows[0]!.next_order);
        // pg encodes Date parameters in host time; zone-free storage needs UTC text.
        return (await tx.query(`INSERT INTO policy_categories(title,"order",created_at) VALUES($1,$2,$3) RETURNING ${categoryFields}`, [body.title, order, clock().toISOString()])).rows[0]!;
      });
      return { success: true, data: category(row) };
    });
    app.put(`${url}/reorder`, { onRequest: guard, schema: { body: orderArraySchema, response: { 200: successSchema } } }, async request => {
      const items = request.body as OrderItem[];
      await db.withTransaction(async tx => {
        for (const item of items) await tx.query('UPDATE policy_categories SET "order"=$1 WHERE id=$2', [item.order, item.id]);
      });
      return { success: true };
    });
    app.put(`${url}/:id`, { onRequest: guard, schema: { body: categoryUpdateSchema, response: { 200: successSchema } } }, async request => {
      const id = readDetailId(request);
      const body = request.body as { title?: string; order?: number };
      await db.query('UPDATE policy_categories SET title=COALESCE(NULLIF($1,\'\'),title), "order"=COALESCE($2,"order") WHERE id=$3', [body.title ?? null, body.order ?? null, id]);
      return { success: true };
    });
  }
  registerCascadeDeletes(app, deps, {
    family: 'policy-categories', table: 'policy_categories', capability: CAPABILITY.MANAGE_ABOUT,
    childFamily: 'policy-projects', childTable: 'policy_projects', childColumn: 'category_id',
  });
  for (const url of ['/api/admin/content/policy-projects','/api/policy-projects']) {
    app.put(`${url}/reorder`, { onRequest: guard, schema: { body: orderArraySchema, response: { 200: successSchema } } }, async request => {
      const items = request.body as OrderItem[];
      await db.withTransaction(async tx => {
        for (const item of items) await tx.query('UPDATE policy_projects SET "order"=$1 WHERE id=$2', [item.order, item.id]);
      });
      return { success: true };
    });
  }
  registerJsonRecordWrites(app, deps, policyProjectWrite);
}

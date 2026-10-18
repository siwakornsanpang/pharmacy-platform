import type { FastifyInstance } from 'fastify';
import { CAPABILITY } from '@pharmacy/contracts/access';
import { ProductAdminSummarySchema, ProductAdminDetailSchema, pageSchema, type ProductAdminSummary, type ProductAdminDetail, type Page } from '@pharmacy/contracts/content';
import type { ContentDependencies } from '../public';
import { parseContentQuery } from '../route-manifest';
import { readClauses, readDetailId, jsonTimestamp } from './read-query';
import { registerJsonFamilyWrites } from './article-writes';

// Preserve the legacy Drizzle UTC interpretation before pg decodes zone-free timestamps.
const summaryFields = `id, name, image_url, category, price, created_at AT TIME ZONE 'UTC' AS created_at, updated_at AT TIME ZONE 'UTC' AS updated_at`;
function summary(row: Record<string, unknown>): ProductAdminSummary {
  return { id: row.id as number, name: row.name as string, imageUrl: row.image_url as string | null,
    category: row.category as string, price: row.price as string,
    createdAt: jsonTimestamp(row.created_at), updatedAt: jsonTimestamp(row.updated_at),
  };
}
function detail(row: Record<string, unknown>): ProductAdminDetail {
  return { ...summary(row), description: row.description as string | null };
}

export function registerProductRoutes(app: FastifyInstance, deps: ContentDependencies) {
  const { db, access } = deps;
  const guard = access.requireCapability(CAPABILITY.MANAGE_PRODUCT);
  app.get('/api/admin/content/products', { onRequest: guard, schema: { response: { 200: pageSchema(ProductAdminSummarySchema) } } }, async (request): Promise<Page<ProductAdminSummary>> => {
    const query = parseContentQuery('products', request.query);
    const { where, order, values, pagination } = readClauses(query);
    const count = await db.query(`SELECT count(*) AS total FROM products${where}`, values);
    const rows = await db.query(`SELECT ${summaryFields} FROM products${where}${order}${pagination}`, [...values, query.pageSize, query.offset]);
    return { items: rows.rows.map(summary), total: Number(count.rows[0]!.total), page: query.page, pageSize: query.pageSize };
  });
  app.get('/api/admin/content/products/:id', { onRequest: guard, schema: { response: { 200: ProductAdminDetailSchema, 404: { type: 'object', properties: { message: { type: 'string' } }, required: ['message'], additionalProperties: false } } } }, async (request, reply) => {
    const id = readDetailId(request);
    const row = (await db.query(`SELECT ${summaryFields}, description FROM products WHERE id=$1`, [id])).rows[0];
    if (!row) return reply.code(404).send({ message: 'Content not found' });
    return detail(row);
  });
  registerJsonFamilyWrites(app, deps, 'products');
}

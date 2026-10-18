import { createRichTextSanitizer } from '../rich-text';
import type { FastifyInstance } from 'fastify';
import { CAPABILITY } from '@pharmacy/contracts/access';
import { NewsAdminSummarySchema, NewsAdminDetailSchema, pageSchema, type NewsAdminSummary, type NewsAdminDetail, type Page } from '@pharmacy/contracts/content';
import type { ContentDependencies } from '../public';
import { parseContentQuery } from '../route-manifest';
import { readClauses, readDetailId, jsonTimestamp } from './read-query';
import { registerJsonFamilyWrites } from './article-writes';

// Preserve the legacy Drizzle UTC interpretation before pg decodes zone-free timestamps.
const summaryFields = `id, title, excerpt, thumbnail_url, category, status, created_at AT TIME ZONE 'UTC' AS created_at, updated_at AT TIME ZONE 'UTC' AS updated_at, published_at AT TIME ZONE 'UTC' AS published_at, is_highlight`;
function summary(row: Record<string, unknown>): NewsAdminSummary {
  return { id: row.id as number, title: row.title as string, excerpt: row.excerpt as string | null,
    thumbnailUrl: row.thumbnail_url as string | null, category: row.category as NewsAdminSummary['category'],
    status: row.status as NewsAdminSummary['status'], createdAt: jsonTimestamp(row.created_at),
    updatedAt: jsonTimestamp(row.updated_at), publishedAt: jsonTimestamp(row.published_at), isHighlight: row.is_highlight as boolean | null,
  };
}
function detail(row: Record<string, unknown>, sanitize: (html: string) => string): NewsAdminDetail {
  return { ...summary(row), content: sanitize(row.content as string) };
}

export function registerNewsRoutes(app: FastifyInstance, deps: ContentDependencies) {
  const { db, access, config } = deps;
  const sanitize = createRichTextSanitizer(config?.contentImageSources ?? []);
  const guard = access.requireCapability(CAPABILITY.MANAGE_NEWS);
  app.get('/api/admin/content/news', { onRequest: guard, schema: { response: { 200: pageSchema(NewsAdminSummarySchema) } } }, async (request): Promise<Page<NewsAdminSummary>> => {
    const query = parseContentQuery('news', request.query);
    const { where, order, values, pagination } = readClauses(query);
    const count = await db.query(`SELECT count(*) AS total FROM news${where}`, values);
    const rows = await db.query(`SELECT ${summaryFields} FROM news${where}${order}${pagination}`, [...values, query.pageSize, query.offset]);
    return { items: rows.rows.map(summary), total: Number(count.rows[0]!.total), page: query.page, pageSize: query.pageSize };
  });
  app.get('/api/admin/content/news/:id', { onRequest: guard, schema: { response: { 200: NewsAdminDetailSchema, 404: { type: 'object', properties: { message: { type: 'string' } }, required: ['message'], additionalProperties: false } } } }, async (request, reply) => {
    const id = readDetailId(request);
    const row = (await db.query(`SELECT ${summaryFields}, content FROM news WHERE id=$1`, [id])).rows[0];
    if (!row) return reply.code(404).send({ message: 'Content not found' });
    return detail(row,sanitize);
  });
  registerJsonFamilyWrites(app, deps, 'news');
}

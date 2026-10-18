import type { FastifyRequest, FastifyReply } from 'fastify';
import { ContentQueryError, parseContentId, type ParsedContentQuery } from '../route-manifest';

// Identifiers come only from parseContentQuery's finite, code-owned maps.
export function readClauses(query: ParsedContentQuery) {
  const values = query.filters.map(filter => filter.value);
  const where = query.filters.length ? ` WHERE ${query.filters.map((filter, index) =>
    `"${filter.column}" ${filter.operator === 'ilike' ? 'ILIKE' : '='} $${index + 1}${filter.operator === 'ilike' ? " ESCAPE E'\\\\'" : ''}`).join(' AND ')}` : '';
  const order = ` ORDER BY ${query.order.map(item => `"${item.column}" ${item.direction.toUpperCase()} NULLS LAST`).join(', ')}`;
  return { where, order, values, pagination: ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}` };
}
export function readDetailId(request: FastifyRequest): number {
  if (Object.keys(request.query as object).length) throw new ContentQueryError('Detail queries are unsupported');
  return parseContentId((request.params as { id: string }).id);
}
export function jsonTimestamp(value: unknown): string | null {
  if (value === null) return null;
  if (!(value instanceof Date)) throw new Error('Expected database timestamp');
  return value.toISOString();
}
export async function mediaUnavailable(_request: FastifyRequest, reply: FastifyReply) {
  return reply.code(503).send({ message: 'Content media operations temporarily unavailable' });
}

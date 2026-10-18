/** UTC/offset ISO timestamps on the wire; never Date instances. */
export type ContentTimestamp = string;
/** PostgreSQL numeric(10,2), transported without floating point conversion. */
export type ContentPrice = string;
export interface ContentListQuery { page?: number; pageSize?: number; q?: string; category?: string; status?: string; sort?: string; direction?: 'asc' | 'desc' }
export interface Page<T> { items: T[]; total: number; page: number; pageSize: number }

// Focused JSON schema primitives shared by the explicit family projections.
export type ContentJsonSchema = Readonly<Record<string, unknown>>;
export const contentId = { type: 'integer', minimum: 1, maximum: 2147483647 } as const;
export const contentInteger = { type: 'integer', minimum: -2147483648, maximum: 2147483647 } as const;
export const contentText = { type: 'string' } as const;
export const contentBoolean = { type: 'boolean' } as const;
export const contentTimestamp = { type: 'string', pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])T([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|[+-](?:[01]\\d|2[0-3]):[0-5]\\d)$' } as const;
export const contentDate = { type: 'string', pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$' } as const;
export const contentPrice = { type: 'string', pattern: '^-?\\d{1,8}(?:\\.\\d{1,2})?$' } as const;
export const contentNullable = (schema: ContentJsonSchema): ContentJsonSchema => ({ anyOf: [schema, { type: 'null' }] });
export const contentObject = (properties: Record<string, ContentJsonSchema>): ContentJsonSchema => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
export const contentCount = { type: 'integer', minimum: 0, maximum: Number.MAX_SAFE_INTEGER } as const;
export const ContentListQuerySchema = {
  type: 'object', additionalProperties: false,
  properties: {
    page: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER },
    pageSize: { type: 'integer', minimum: 1, maximum: 100 },
    q: { type: 'string', maxLength: 200 },
    category: { type: 'string', minLength: 1, maxLength: 100 },
    status: { type: 'string', minLength: 1, maxLength: 100 },
    sort: { type: 'string', minLength: 1, maxLength: 100 },
    direction: { type: 'string', enum: ['asc','desc'] },
  },
  dependencies: { direction: ['sort'] },
} as const;
export function pageSchema(itemSchema: ContentJsonSchema): ContentJsonSchema {
  return contentObject({ items: { type: 'array', items: itemSchema }, total: contentCount,
    page: { type: 'integer', minimum: 1, maximum: Number.MAX_SAFE_INTEGER }, pageSize: { type: 'integer', minimum: 1, maximum: 100 } });
}

/** Schemas above are lexical wire primitives; mutation boundaries must also use these calendar predicates. */
export function isContentDate(value: unknown): value is string {
  if (typeof value !== 'string' || !new RegExp(contentDate.pattern).test(value)) return false;
  const [year,month,day] = value.split('-').map(Number) as [number,number,number];
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31,leap ? 29 : 28,31,30,31,30,31,31,30,31,30,31][month - 1]!;
}
export function isContentTimestamp(value: unknown): value is string {
  return typeof value === 'string' && new RegExp(contentTimestamp.pattern).test(value) && isContentDate(value.slice(0,10)) && Number.isFinite(Date.parse(value));
}

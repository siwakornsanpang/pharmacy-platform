export class RegistryQueryError extends Error {
  readonly statusCode = 400;
}

const invalid = (key: string): never => { throw new RegistryQueryError(`Invalid Registry query: ${key}`); };
export interface ParsedRegistryQuery {
  page: number;
  pageSize: number;
  offset: number;
  q?: string;
  province?: string;
  status?: string;
  sort: 'name' | 'license';
  direction: 'asc' | 'desc';
}

export function parseRegistryId(value: unknown): number {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return invalid('id');
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id > 2147483647) return invalid('id');
  return id;
}

export function parseRegistryQuery(input: unknown): ParsedRegistryQuery {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return invalid('query');
  const raw = input as Record<string, unknown>;
  const allowed = ['q', 'province', 'status', 'page', 'pageSize', 'sort', 'direction'];
  for (const key of Object.keys(raw)) if (!allowed.includes(key)) return invalid(key);
  const positive = (key: 'page' | 'pageSize', fallback: number, maximum: number) => {
    const value = raw[key];
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return invalid(key);
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number > maximum) return invalid(key);
    return number;
  };
  const text = (key: 'q' | 'province' | 'status', maximum: number, empty: boolean) => {
    const value = raw[key];
    if (value === undefined) return undefined;
    if (typeof value !== 'string') return invalid(key);
    const trimmed = value.trim();
    if ((!empty && !trimmed) || trimmed.length > maximum) return invalid(key);
    return trimmed;
  };
  const page = positive('page', 1, Number.MAX_SAFE_INTEGER);
  const pageSize = positive('pageSize', 10, 100);
  const offset = (page - 1) * pageSize;
  if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(offset + pageSize)) return invalid('page');
  const sort = raw.sort === undefined ? 'name' : raw.sort;
  if (sort !== 'name' && sort !== 'license') return invalid('sort');
  if (raw.direction !== undefined && raw.sort === undefined) return invalid('direction');
  const direction = raw.direction === undefined ? 'asc' : raw.direction;
  if (direction !== 'asc' && direction !== 'desc') return invalid('direction');
  const q = text('q', 200, true);
  return {
    page, pageSize, offset, sort, direction,
    ...(q ? { q } : {}),
    ...(raw.province === undefined ? {} : { province: text('province', 100, false)! }),
    ...(raw.status === undefined ? {} : { status: text('status', 100, false)! }),
  };
}

export function registryClauses(query: ParsedRegistryQuery) {
  const values: unknown[] = [];
  const where: string[] = [];
  if (query.q) {
    values.push(`%${query.q.replace(/[\\%_]/g, '\\$&')}%`);
    const parameter = `$${values.length}`;
    where.push(`(name ILIKE ${parameter} ESCAPE E'\\\\' OR registration_id ILIKE ${parameter} ESCAPE E'\\\\' OR province ILIKE ${parameter} ESCAPE E'\\\\')`);
  }
  for (const [column, value] of [['province', query.province], ['status', query.status]] as const) if (value !== undefined) {
    values.push(value);
    where.push(`btrim(${column})=$${values.length}`);
  }
  const column = query.sort === 'license' ? 'registration_id' : 'name';
  return {
    values,
    where: where.length ? ` WHERE ${where.join(' AND ')}` : '',
    order: ` ORDER BY ${column} ${query.direction.toUpperCase()} NULLS LAST, id ASC`,
  };
}

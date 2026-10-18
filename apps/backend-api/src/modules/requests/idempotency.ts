import { createHash } from 'node:crypto';
import type { Database, QueryClient } from '../../db/client';

export interface OperationResult {
  status: number;
  body: Record<string, unknown>;
  replayed?: boolean;
}
export interface OperationAuthority {
  actorKey: string;
  method: 'POST' | 'PUT' | 'DELETE';
  operation: string;
  targetId: string;
  key: string;
}

export class RequestOperationError extends Error {
  constructor(public readonly statusCode: 400 | 409 | 503, message: string) { super(message); }
}

export function parseIdempotencyKey(value: unknown): string {
  if (typeof value !== 'string' || !/^[\x21-\x7e]{1,128}$/.test(value))
    throw new RequestOperationError(400, 'Invalid Idempotency-Key');
  return value;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stableValue(item)]),
  );
  return value;
}

export function canonicalInputHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(stableValue(value))).digest('hex');
}

function routeScope(operation: string, targetId: string): string {
  return `${operation}:${JSON.stringify(targetId)}`;
}

export async function executeIdempotent(
  db: Database,
  authority: OperationAuthority,
  input: unknown,
  work: (tx: QueryClient) => Promise<OperationResult>,
): Promise<OperationResult> {
  const requestHash = canonicalInputHash(input);
  const route = routeScope(authority.operation, authority.targetId);
  return db.withTransaction(async tx => {
    const inserted = (await tx.query(`INSERT INTO request_operation_keys
      (actor_key,method,route,key,request_hash) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(actor_key,method,route,key) DO NOTHING RETURNING id`,
    [authority.actorKey, authority.method, route, authority.key, requestHash])).rows[0];
    if (!inserted) {
      const stored = (await tx.query(`SELECT request_hash,result,status FROM request_operation_keys
        WHERE actor_key=$1 AND method=$2 AND route=$3 AND key=$4 FOR UPDATE`,
      [authority.actorKey, authority.method, route, authority.key])).rows[0];
      if (!stored) throw new RequestOperationError(503, 'Request operation unavailable');
      if (stored.request_hash !== requestHash) throw new RequestOperationError(409, 'Idempotency-Key payload conflict');
      if (!Number.isInteger(stored.status) || !stored.result || typeof stored.result !== 'object')
        throw new RequestOperationError(503, 'Request operation unavailable');
      return { status: stored.status as number, body: stored.result as Record<string, unknown>, replayed: true };
    }
    const result = await work(tx);
    await tx.query('UPDATE request_operation_keys SET result=$1::jsonb,status=$2 WHERE id=$3',
      [JSON.stringify(result.body), result.status, inserted.id]);
    return result;
  });
}

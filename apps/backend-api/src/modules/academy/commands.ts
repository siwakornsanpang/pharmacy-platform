import { createHash } from 'node:crypto';
import type { Database, QueryClient } from '../../db/client';
import { AcademyError } from './public';

export type CommandActor = { kind: 'staff' | 'pharmacy-mock'; id: string };

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, stable(item)]),
  );
  return value;
}

export function commandHash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

export function parseCommandKey(value: unknown): string {
  if (typeof value !== 'string' || !/^[\x21-\x7e]{1,128}$/.test(value))
    throw new AcademyError(400, 'Invalid Idempotency-Key');
  return value;
}

export async function executeAcademyCommand<T extends Record<string, unknown>>(
  db: Database,
  actor: CommandActor,
  operation: string,
  key: string,
  input: unknown,
  work: (tx: QueryClient) => Promise<T>,
): Promise<T> {
  const requestHash = commandHash(input);
  return db.withTransaction(async tx => {
    const inserted = (await tx.query(
      `INSERT INTO academy_commands(actor_kind,actor_id,operation,idempotency_key,request_hash)
       VALUES($1,$2,$3,$4,$5)
       ON CONFLICT (actor_kind,actor_id,operation,idempotency_key) DO NOTHING RETURNING id`,
      [actor.kind, actor.id, operation, key, requestHash],
    )).rows[0];
    if (!inserted) {
      const stored = (await tx.query(
        `SELECT request_hash,result,status FROM academy_commands
         WHERE actor_kind=$1 AND actor_id=$2 AND operation=$3 AND idempotency_key=$4 FOR UPDATE`,
        [actor.kind, actor.id, operation, key],
      )).rows[0];
      if (!stored) throw new AcademyError(503, 'Academy command unavailable');
      if (stored.request_hash !== requestHash) throw new AcademyError(409, 'Idempotency-Key payload conflict');
      if (!Number.isInteger(stored.status) || !stored.result || typeof stored.result !== 'object')
        throw new AcademyError(503, 'Academy command unavailable');
      return stored.result as T;
    }
    const result = await work(tx);
    await tx.query('UPDATE academy_commands SET result=$1::jsonb,status=$2 WHERE id=$3',
      [JSON.stringify(result), 200, inserted.id]);
    return result;
  });
}

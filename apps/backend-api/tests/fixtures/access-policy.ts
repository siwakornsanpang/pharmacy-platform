import assert from 'node:assert/strict';
import type { Database } from '../../src/db/client';
// Reach the barrier on independent checked-out connections before taking the Access lock.
export function barrierDatabase(db: Database, count: number, onBarrier?: () => Promise<void>): Database {
  let arrived = 0;
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const connections = new Set<unknown>();
  return {
    ...db,
    withTransaction: work => db.withTransaction(tx => work({
      query: async (sql, values) => {
        if (sql.includes('pg_advisory_xact_lock')) {
          connections.add((await tx.query('SELECT pg_backend_pid() AS pid')).rows[0]?.pid);
          if (++arrived === count) {
            assert.equal(connections.size, count, 'Barrier must use independent SQL connections');
            await onBarrier?.();
            release();
          }
          await gate;
        }
        return tx.query(sql, values);
      },
    })),
  };
}

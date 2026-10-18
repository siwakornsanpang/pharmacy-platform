import type { QueryClient } from '../../db/client';

// All Access mutations/bootstrap take this first, then resolve actor and target state.
// Logout participates to serialize session revocation; login only locks its user row and never takes this lock.
export async function lockAccessPolicy(tx: QueryClient): Promise<void> {
  await tx.query('SELECT pg_advisory_xact_lock(20261014,5)');
}

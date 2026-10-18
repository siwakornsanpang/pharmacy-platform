import type { Database } from '../../src/db/client';

export function databaseFixture(options: { available?: boolean; schemaReady?: boolean } = {}) {
  const queries: { sql: string; values?: unknown[] }[] = [];
  let closeCalls = 0;
  const db: Database = {
    async query(sql, values) {
      queries.push({ sql, values });
      if (options.available === false) throw new Error('database-secret-marker');
      if (sql === 'SELECT 1') return { rows: [{ '?column?': 1 }] };
      return { rows: [{ ready: options.schemaReady ?? true }] };
    },
    async close() { closeCalls++; },
    async withTransaction() { throw new Error('query-only readiness fixture must never start a transaction'); },
  };
  return { db, queries, get closeCalls() { return closeCalls; } };
}

export const backendEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://test:fake-secret@db.example.test/pharmacy',
  SUPABASE_URL: 'https://storage.example.test',
  SUPABASE_KEY: 'fake-storage-secret',
  JWT_SECRET: 'fake-jwt-secret-at-least-32-characters',
  JWT_ISSUER: 'pharmacy-backend',
  JWT_AUDIENCE: 'pharmacy-staff',
  STAFF_SESSION_TTL_SECONDS: '3600',
  CORS_ORIGINS: 'https://office.example.test,https://web.example.test',
  ACADEMY_BRIDGE_KEY: 'fake-academy-secret',
  PUBLIC_UPLOAD_BASE_URL: 'https://upload.example.test',
};

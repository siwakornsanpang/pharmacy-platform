import { Pool } from 'pg';

export interface QueryClient {
  query(sql: string, values?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
}

export interface Database extends QueryClient {
  withTransaction<T>(work: (tx: QueryClient) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export function createDatabase(databaseUrl: string): Database {
  let pool: Pool | undefined;
  let closed = false;
  const getPool = () => {
    if (closed) throw new Error('Database is closed');
    if (!pool) {
      pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 5000, query_timeout: 5000 });
      pool.on('error', () => { console.error('Database idle connection failed'); });
    }
    return pool;
  };
  return {
    query: (sql, values) => getPool().query(sql, values),
    async withTransaction(work) {
      const client = await getPool().connect();
      let releaseError: Error | undefined;
      try {
        await client.query('BEGIN');
        const result = await work({ query: (sql, values) => client.query(sql, values) });
        await client.query('COMMIT');
        return result;
      } catch (error) {
        try { await client.query('ROLLBACK'); }
        catch { releaseError = new Error('Transaction rollback failed'); }
        throw error;
      } finally { client.release(releaseError); }
    },
    async close() {
      if (closed) return;
      closed = true;
      await pool?.end();
    },
  };
}

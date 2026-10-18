import assert from 'node:assert/strict';
import test, { mock } from 'node:test';
import { Pool } from 'pg';
import { createDatabase } from '../src/db/client';
import { checkDatabaseReadiness } from '../src/db/readiness';
import { buildApp } from '../src/app';
import { getServerConfig } from '../src/config/server';
import { backendEnv } from './fixtures/database';

test('transactions use one checked-out client and release after commit', async () => {
  const sql: string[] = [];
  let releases = 0;
  const connect = mock.method(Pool.prototype, 'connect', async () => ({
    query: async (statement: string) => { sql.push(statement); return { rows: [{ value: 7 }] }; },
    release: () => { releases++; },
  }));
  const poolQuery = mock.method(Pool.prototype, 'query', () => { throw new Error('transaction escaped checked-out client'); });
  const end = mock.method(Pool.prototype, 'end', async () => {});
  const db = createDatabase('postgresql://test@127.0.0.1/pharmacy_test_fake');
  try {
    assert.equal(connect.mock.callCount(), 0);
    const result = await db.withTransaction(async (tx) => (await tx.query('SELECT value')).rows[0]?.value);
    assert.equal(result, 7);
    assert.deepEqual(sql, ['BEGIN', 'SELECT value', 'COMMIT']);
    assert.equal(releases, 1);
    await db.close();
    assert.equal(end.mock.callCount(), 1);
  } finally { connect.mock.restore(); poolQuery.mock.restore(); end.mock.restore(); }
});

test('failed transaction rolls back and releases while preserving the original error', async () => {
  for (const rollbackFails of [false, true]) {
    const sql: string[] = [];
    let releases = 0;
    let discarded = false;
    const connect = mock.method(Pool.prototype, 'connect', async () => ({
      query: async (statement: string) => { sql.push(statement); if (statement === 'ROLLBACK' && rollbackFails) throw new Error('rollback failed'); return { rows: [] }; },
      release: (error?: Error) => { releases++; discarded = Boolean(error); },
    }));
    const end = mock.method(Pool.prototype, 'end', async () => {});
    const db = createDatabase('postgresql://test@127.0.0.1/pharmacy_test_fake');
    const failure = new Error('original mutation failed');
    try {
      await assert.rejects(db.withTransaction(async (tx) => { await tx.query('UPDATE fixture'); throw failure; }), (error) => error === failure);
      assert.deepEqual(sql, ['BEGIN', 'UPDATE fixture', 'ROLLBACK']);
      assert.equal(releases, 1);
      assert.equal(discarded, rollbackFails);
      await db.close();
    } finally { connect.mock.restore(); end.mock.restore(); }
  }
});

test('idle pool errors preserve liveness and permit readiness to recover without leaking diagnostics', async () => {
  const marker = 'synthetic-private-connection-marker';
  let available = true;
  let ownedPool: Pool | undefined;
  const query = mock.method(Pool.prototype, 'query', async function (this: Pool) {
    ownedPool = this;
    if (!available) throw new Error(marker);
    return { rows: [{ ready: true }] };
  });
  const end = mock.method(Pool.prototype, 'end', async () => {});
  const diagnostic = mock.method(console, 'error', () => {});
  const db = createDatabase('postgresql://test@127.0.0.1/pharmacy_test_fake');
  const app = await buildApp({ config: getServerConfig(backendEnv), db });
  const requirement = { version: '0008', tables: ['public.users'], migrationHashes: ['fixture-hash'] };
  try {
    assert.equal(await checkDatabaseReadiness(db, requirement), true);
    available = false;
    assert.doesNotThrow(() => ownedPool!.emit('error', new Error(marker), { privateConnection: marker }));
    assert.equal(diagnostic.mock.callCount(), 1);
    assert.equal(diagnostic.mock.calls[0]!.arguments.length, 1);
    assert.equal(typeof diagnostic.mock.calls[0]!.arguments[0], 'string');
    assert.equal(JSON.stringify(diagnostic.mock.calls).includes(marker), false);
    assert.equal(await checkDatabaseReadiness(db, requirement), false);
    assert.equal((await app.inject({ method: 'GET', url: '/health' })).statusCode, 200);
    assert.equal((await app.inject({ method: 'GET', url: '/ready' })).statusCode, 503);
    available = true;
    assert.equal(await checkDatabaseReadiness(db, requirement), true);
    assert.equal((await app.inject({ method: 'GET', url: '/health' })).statusCode, 200);
  } finally {
    await app.close();
    await db.close();
    query.mock.restore();
    end.mock.restore();
    diagnostic.mock.restore();
  }
});

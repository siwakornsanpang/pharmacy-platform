import assert from 'node:assert/strict';
import test from 'node:test';
import { mock } from 'node:test';
import { Pool } from 'pg';
import Fastify from 'fastify';
import { buildApp } from '../src/app';
import { getServerConfig } from '../src/config/server';
import { backendEnv, databaseFixture } from './fixtures/database';

test('app_construction_has_no_seed_or_listen', async () => {
  let seedCalls = 0;
  let listenCalls = 0;
  const fixture = databaseFixture();
  const originalQuery = fixture.db.query;
  fixture.db.query = async (sql, values) => {
    if (/insert|update|delete|create|alter/i.test(sql)) seedCalls++;
    return originalQuery(sql, values);
  };
  const listen = mock.method(Fastify().server.constructor.prototype, 'listen', () => { listenCalls++; });
  const app = await buildApp({ config: getServerConfig(backendEnv), db: fixture.db });
  try {
    assert.equal(seedCalls, 0);
    assert.equal(listenCalls, 0);
    assert.deepEqual(fixture.queries, []);
    assert.equal((await app.inject({ method: 'GET', url: '/health' })).statusCode, 200);
    assert.equal((await app.inject({ method: 'POST', url: '/auth/seed' })).statusCode, 404);
    assert.equal((await app.inject({ method: 'GET', url: '/products' })).statusCode, 404);
  } finally { await app.close(); listen.mock.restore(); }
  assert.equal(fixture.closeCalls, 0);
});

test('owned database pool stays lazy and closes with its app', async () => {
  const connect = mock.method(Pool.prototype, 'connect', () => { throw new Error('must not connect'); });
  const end = mock.method(Pool.prototype, 'end', async () => {});
  const app = await buildApp({ config: getServerConfig(backendEnv) });
  try {
    assert.equal((await app.inject({ method: 'GET', url: '/health' })).statusCode, 200);
    assert.equal(connect.mock.callCount(), 0);
    assert.equal((await app.inject({ method: 'GET', url: '/ready' })).statusCode, 503);
    await app.close();
    assert.equal(end.mock.callCount(), 1);
  } finally { connect.mock.restore(); end.mock.restore(); }
});

for (const [name, options, status] of [
  ['complete schema and migration hashes', {}, 200],
  ['database down', { available: false }, 503],
  ['database ping succeeds but migration/schema missing', { schemaReady: false }, 503],
] as const) {
  test(`readiness: ${name}`, async () => {
    const fixture = databaseFixture(options);
    const app = await buildApp({ config: getServerConfig(backendEnv), db: fixture.db });
    try {
      const response = await app.inject({ method: 'GET', url: '/ready' });
      assert.equal(response.statusCode, status);
      assert.equal(response.body.includes('secret'), false);
      assert.equal(fixture.queries[0]?.sql, 'SELECT 1');
    } finally { await app.close(); }
  });
}

test('CORS only accepts the exact configured origins', async () => {
  const app = await buildApp({ config: getServerConfig(backendEnv), db: databaseFixture().db });
  try {
    for (const origin of ['https://office.example.test', 'https://web.example.test']) {
      const response = await app.inject({ method: 'GET', url: '/health', headers: { origin } });
      assert.equal(response.headers['access-control-allow-origin'], origin);
    }
    for (const origin of ['https://office.example.test.evil.test', 'http://localhost:3000', 'null', 'https://evil.test']) {
      const response = await app.inject({ method: 'GET', url: '/health', headers: { origin } });
      assert.equal(response.headers['access-control-allow-origin'], undefined);
    }
  } finally { await app.close(); }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { checkDatabaseReadiness, getReadinessRequirement } from '../src/db/readiness';
import { databaseFixture } from './fixtures/database';

test('checked-in readiness requires access and media tables and hashes through 0009', () => {
  const requirement = getReadinessRequirement()!;
  assert.equal(requirement.version, '0009');
  assert.deepEqual(requirement.tables, [
    'public.users', 'public.permissions', 'public.role_permissions', 'public.roles', 'public.staff_sessions', 'public.access_audit',
    'public.media_assets', 'public.media_asset_pins', 'public.media_asset_references', 'public.media_cleanup_jobs', 'public.media_upload_intents',
    'public.content_asset_refs', 'public.content_media_intents', 'public.request_asset_refs', 'public.request_media_intents', 'public.request_operation_keys',
  ]);
  assert.equal(requirement.migrationHashes.length, 10);
});

test('full schema and applied migration hashes permit readiness', async () => {
  const fixture = databaseFixture();
  const ready = await checkDatabaseReadiness(fixture.db, { version: '0008', tables: ['public.users'], migrationHashes: ['test-hash'] });
  assert.equal(ready, true);
  assert.equal(fixture.queries[0]?.sql, 'SELECT 1');
  assert.match(fixture.queries[1]!.sql, /drizzle\.__drizzle_migrations/);
  assert.match(fixture.queries[1]!.sql, /to_regclass/);
  assert.deepEqual(fixture.queries[1]!.values, [['public.users'], ['test-hash']]);
});

test('a ping cannot replace missing schema or hashes', async () => {
  for (const requirement of [null, { version: '0008', tables: ['public.users'], migrationHashes: ['missing-hash'] }]) {
    assert.equal(await checkDatabaseReadiness(databaseFixture({ schemaReady: false }).db, requirement), false);
  }
});

test('actual Access schema and trusted migration hashes govern HTTP readiness', async () => {
  const { accessFixture } = await import('./fixtures/access');
  const { buildApp } = await import('../src/app');
  const f = await accessFixture(true);
  const app = await buildApp(f);
  try {
    assert.equal((await app.inject('/ready')).statusCode, 503);
    await f.migrateAccess();
    assert.equal((await app.inject('/ready')).statusCode, 503);
    await f.migrateMedia();
    assert.equal((await app.inject('/ready')).statusCode, 200);
    await f.db.query("UPDATE drizzle.__drizzle_migrations SET hash='fake-untrusted' WHERE id=(SELECT max(id) FROM drizzle.__drizzle_migrations)");
    assert.equal((await app.inject('/ready')).statusCode, 503);
    const hashes = getReadinessRequirement()!.migrationHashes;
    await f.db.query('UPDATE drizzle.__drizzle_migrations SET hash=$1 WHERE id=(SELECT max(id) FROM drizzle.__drizzle_migrations)', [hashes[9]]);
    await f.db.query('ALTER TABLE staff_sessions RENAME TO fake_missing_sessions');
    assert.equal((await app.inject('/ready')).statusCode, 503);
    await f.db.query('ALTER TABLE fake_missing_sessions RENAME TO staff_sessions');
    await f.db.query('ALTER SCHEMA drizzle RENAME TO fake_missing_migrations');
    assert.equal((await app.inject('/ready')).statusCode, 503);
  } finally { await app.close(); await f.cleanup(); }
});

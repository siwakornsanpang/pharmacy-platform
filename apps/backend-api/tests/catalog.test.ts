import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CAPABILITY, capabilityCatalog } from '@pharmacy/contracts/access';
import { syncCapabilityCatalog } from '../src/modules/access/catalog';
import { createAccessService } from '../src/modules/access/service';
import { accessFixture, guardTestDatabase, seedStaff } from './fixtures/access';

// Catches deleting/replacing assignments, awakening dormant keys, losing unknown metadata,
// changing existing IDs, or rewriting metadata on an unchanged second sync.
test('sync_twice_preserves_legacy_and_assignments', async () => {
  const f = await accessFixture();
  try {
    const staff = await seedStaff(f.db);
    await f.db.query(`INSERT INTO roles(name) VALUES ('zero_grants');
      INSERT INTO permissions(key,label,"group","order") VALUES ('unknown_legacy','Keep label','Keep group',98);
      INSERT INTO role_permissions(role,permission_key,is_active) VALUES
        ('editor','manage_home',false),('editor','manage_news',true),('editor','unknown_legacy',false);
      INSERT INTO staff_sessions(id,user_id,created_at,expires_at) VALUES ('fake-session',${staff.id},'2026-10-15T12:00:00Z','2026-10-15T13:00:00Z');`);
    const preserved = async () => ({
      grants: (await f.db.query('SELECT * FROM role_permissions ORDER BY id')).rows,
      legacy: (await f.db.query("SELECT * FROM permissions WHERE key='unknown_legacy'")).rows,
      roles: (await f.db.query('SELECT * FROM roles ORDER BY name')).rows,
      users: (await f.db.query('SELECT * FROM users ORDER BY id')).rows,
    });
    const before = await preserved();
    const existingId = (await f.db.query("SELECT id FROM permissions WHERE key='manage_news'")).rows[0]!.id;
    assert.deepEqual(await syncCapabilityCatalog(f.db, capabilityCatalog), { inserted: 19, updated: 1 });
    const after = await preserved();
    assert.deepEqual(after.grants, before.grants);
    assert.deepEqual(after.legacy, before.legacy);
    assert.deepEqual(after.roles, before.roles);
    assert.deepEqual(after.users, before.users);
    assert.equal((await f.db.query("SELECT id FROM permissions WHERE key='manage_news'")).rows[0]!.id, existingId);
    assert.equal((await f.db.query("SELECT count(*)::int AS count FROM role_permissions WHERE role='zero_grants'")).rows[0]!.count, 0);
    for (const definition of capabilityCatalog) assert.deepEqual(
      (await f.db.query('SELECT label,"group","order" FROM permissions WHERE key=$1', [definition.key])).rows[0],
      { label: definition.label, group: definition.group, order: definition.order });
    const definitions = (await f.db.query('SELECT * FROM permissions ORDER BY id')).rows;
    assert.deepEqual(await syncCapabilityCatalog(f.db, capabilityCatalog), { inserted: 0, updated: 0 });
    assert.deepEqual((await f.db.query('SELECT * FROM permissions ORDER BY id')).rows, definitions);
    assert.deepEqual(await preserved(), before);
    const service = createAccessService(f, { sign: () => '', verify: () => { throw new Error('unused'); } });
    const actor = await service.resolveStoredStaffSession(staff.id, 'fake-session');
    const delegateHasNewKey = actor.permissions.includes(CAPABILITY.MANAGE_HOME);
    assert.equal(delegateHasNewKey, false);
    assert.deepEqual(actor.permissions, ['manage_news']);
    assert.equal(actor.permissions.includes(CAPABILITY.MANAGE_LAW), false);
  } finally { await f.cleanup(); }
});

// Catches writes escaping the checked-out transaction when a later definition fails.
test('failure_mid_sync_rolls_back_all_metadata', async () => {
  const f = await accessFixture();
  try {
    await seedStaff(f.db);
    const snapshot = async () => ({
      permissions: (await f.db.query('SELECT * FROM permissions ORDER BY id')).rows,
      grants: (await f.db.query('SELECT * FROM role_permissions ORDER BY id')).rows,
      roles: (await f.db.query('SELECT * FROM roles ORDER BY name')).rows,
    });
    const before = await snapshot();
    await f.db.query(`ALTER TABLE permissions ADD CONSTRAINT test_sync_failure CHECK (key <> 'manage_home')`);
    await assert.rejects(syncCapabilityCatalog(f.db, [
      { key: CAPABILITY.MANAGE_NEWS, label: 'Must roll back', group: null, order: 7 },
      { key: CAPABILITY.MANAGE_HOME, label: 'Rejected second write', group: null, order: 8 },
    ]), { code: '23514' });
    assert.deepEqual(await snapshot(), before);
  } finally { await f.cleanup(); }
});

// Catches dotenv/runtime-config fallback and leaking credentials in operator failures.
test('operator_cli_rejects_missing_or_invalid_migration_url_without_secret_logs', () => {
  const script = resolve(__dirname, '../scripts/catalog-sync.ts');
  for (const value of [undefined, 'https://migration-user:secret-marker@invalid.example/pharmacy',
    'postgresql://migration-user:secret-marker@invalid.example/',
    'postgresql://migration-user:secret-marker@invalid.example/pharmacy#secret-marker']) {
    const result = spawnSync(process.execPath, ['--import', 'tsx', script], {
      env: { PATH: process.env.PATH, DATABASE_URL: 'postgresql://runtime:runtime-secret@invalid.example/pharmacy',
        ...(value === undefined ? {} : { MIGRATION_DATABASE_URL: value }) }, encoding: 'utf8', timeout: 15000,
    });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr.trim(), 'Capability catalog sync failed');
  }
});

// Catches operator sync depending on runtime JWT/storage config or reseeding grants.
test('operator_cli_syncs_only_metadata_without_runtime_credentials', async () => {
  const f = await accessFixture();
  try {
    await seedStaff(f.db);
    const grants = (await f.db.query('SELECT * FROM role_permissions ORDER BY id')).rows;
    const databaseName = (await f.db.query('SELECT current_database() AS name')).rows[0]!.name;
    const configured = process.env.TEST_DATABASE_URL ??
      JSON.parse(readFileSync(resolve(__dirname,
        '../../..', '.superpowers/test-postgres/connection.json'), 'utf8')).testDatabaseUrl;
    const url = guardTestDatabase(configured);
    url.pathname = `/${databaseName}`;
    guardTestDatabase(url.href);
    for (const expected of [{ inserted: 19, updated: 1 }, { inserted: 0, updated: 0 }]) {
      const result = spawnSync(process.execPath,
        ['--import', 'tsx', resolve(__dirname, '../scripts/catalog-sync.ts')], {
          env: { PATH: process.env.PATH, MIGRATION_DATABASE_URL: url.href },
          encoding: 'utf8', timeout: 15000,
        });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stderr, '');
      assert.equal(result.stdout.trim(),
        `Capability catalog synced: inserted=${expected.inserted} updated=${expected.updated}`);
      assert.deepEqual((await f.db.query('SELECT * FROM role_permissions ORDER BY id')).rows, grants);
    }
  } finally { await f.cleanup(); }
});

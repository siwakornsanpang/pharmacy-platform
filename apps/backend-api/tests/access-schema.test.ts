import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { generateDrizzleJson, generateMigration } from 'drizzle-kit/api';
import * as schema from '../src/db/schema';
import { accessFixture, migrationsDirectory } from './fixtures/access';

export const oldHashes = ['536519713a14fb395f9923f723055862fc3aa49a27ad930016a5b00b345152f5','f63f711c28dd411505ed8c73186819ff970095fa82592100ed97538f1477bef3','8291164e645beba27445a1d569e8b9e88b00326e5618891f42d9917447a4818a','12bec29dbcfc33d0409ae13bdae42eda2f11b862ce3985a229b1c1427509ca2f','7ac134b2cf89a6004abadf87e681e6a5fa0238bb8df103e1391e4b5a0fb10afd','fb9b81e091a0daedb3f3f0678a738b1bbc00636bc1873b53bcbac78b769ff048','2d3766a5ab8397019ab77c5ee8c12da191857b656aa91c00f24794a3eebd18aa','e12b2bba228751071b2012f155cd8456cdf50ccf1c977e9ce1c3ad2ea31bbecd'];
const load = (name: string) => JSON.parse(readFileSync(resolve(migrationsDirectory, `meta/${name}`), 'utf8'));

test('source migrations replay confirms the physical constraint names', async () => {
  const f = await accessFixture(true);
  try {
    assert.match(String((await f.db.query("SHOW server_version")).rows[0]?.server_version), /^17\.11(?: |$)/);
    assert.equal((await f.db.query("SHOW timezone")).rows[0]?.TimeZone, 'UTC');
    assert.equal((await f.db.query("SELECT count(*)::int AS count FROM pg_tables WHERE schemaname='public'")).rows[0]?.count, 38);
    const names = (await f.db.query("SELECT conname,confdeltype FROM pg_constraint WHERE connamespace='public'::regnamespace AND contype IN ('f','u') ORDER BY conname")).rows;
    assert.equal(names.length, 22);
    for (const name of ['academy_courses_category_id_fkey', 'academy_courses_instructor_id_fkey', 'academy_course_outcomes_course_id_fkey', 'academy_reviews_course_id_fkey', 'academy_lessons_course_id_fkey', 'academy_enrollments_course_id_fkey', 'academy_lesson_progress_lesson_id_fkey', 'academy_lesson_documents_lesson_id_fkey', 'academy_orders_course_id_fkey', 'academy_refund_requests_order_id_fkey', 'academy_certificates_enrollment_id_fkey', 'academy_certificates_enrollment_id_key', 'academy_enrollments_license_course', 'academy_lesson_progress_license_lesson']) assert.ok(names.some(row => row.conname === name), name);
  } finally { await f.cleanup(); }
});

test('metadata sparse chain preserves Access and allows only staged Content revisions and Registry preservation columns', async () => {
  const first = load('0000_snapshot.json');
  const baseline = load('0007_snapshot.json');
  const access = load('0008_snapshot.json');
  assert.equal(baseline.prevId, first.id); assert.equal(access.prevId, baseline.id);
  assert.equal(new Set([first.id, baseline.id, access.id]).size, 3);
  assert.equal(Object.keys(baseline.tables).length, 38); assert.equal(Object.keys(baseline.enums).length, 7);
  assert.equal(Object.keys(access.tables).length, 41);
  const declared = generateDrizzleJson(schema, access.id);
  for (const name of ['public.home_content', 'public.pharmacist_home_content']) {
    assert.deepEqual(JSON.parse(JSON.stringify(declared.tables[name].columns.revision)), { name: 'revision', type: 'integer', primaryKey: false, notNull: true, default: 1 });
    delete declared.tables[name].columns.revision;
  }
  // Requests/Media own and separately verify staged 0009 declarations.
  delete declared.tables['public.request_operation_keys'];
  for (const name of [
    'media_assets', 'media_asset_pins', 'media_asset_references', 'media_cleanup_jobs', 'media_upload_intents',
    'content_asset_refs', 'content_media_intents', 'request_asset_refs', 'request_media_intents',
    'academy_commands', 'academy_asset_refs', 'academy_media_intents',
  ])
    delete declared.tables[`public.${name}`];
  const stagedRegistry = await generateMigration(access, declared);
  assert.deepEqual(stagedRegistry, [
    'ALTER TABLE "pharmacists" ADD COLUMN "prefix" text;',
    'ALTER TABLE "pharmacists" ADD COLUMN "citizen_id" text;',
  ]);
  delete declared.tables['public.pharmacists'].columns.prefix;
  delete declared.tables['public.pharmacists'].columns.citizen_id;
  // Content and Registry declarations are staged; immutable migration0008 remains the applied baseline.
  assert.deepEqual(await generateMigration(access, declared), []);
  const changes = await generateMigration(baseline, access);
  assert.ok(changes.length > 0);
  for (const sql of changes) assert.ok(!/DROP|academy_|products|requests|pharmacists|home_content/.test(sql), sql);
  const journal = load('_journal.json');
  for (let i = 0; i < 8; i++) assert.equal(createHash('sha256').update(readFileSync(resolve(migrationsDirectory, `${journal.entries[i].tag}.sql`))).digest('hex'), oldHashes[i]);
});

for (const [snapshot, baselineOnly] of [['0007_snapshot.json', true], ['0008_snapshot.json', 'access'], ['0009_snapshot.json', 'media'], ['0010_snapshot.json', false]] as const) test(`${snapshot} matches every replayed column, enum, constraint, and serial ownership`, async () => {
  const f = await accessFixture(baselineOnly);
  try {
    const baseline = load(snapshot);
    const columns = (await f.db.query(`SELECT c.relname AS table_name,a.attname AS name,format_type(a.atttypid,a.atttypmod) AS type,
      a.attnotnull AS not_null,pg_get_expr(d.adbin,d.adrelid) AS default_value,
      pg_get_serial_sequence(format('%I.%I',n.nspname,c.relname),a.attname) AS sequence
      FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
      WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum`)).rows;
    const normalize = (value: unknown) => String(value).replace(/::[a-z_ ]+(\[\])?/g, '').replace(/^\((.*)\)$/, '$1');
    let total = 0;
    for (const table of Object.values(baseline.tables) as any[]) for (const col of Object.values(table.columns) as any[]) {
      total++;
      const physical = columns.find(row => row.table_name === table.name && row.name === col.name);
      assert.ok(physical, `${table.name}.${col.name}`);
      const type = col.type === 'serial' ? 'integer' : col.type === 'timestamp' ? 'timestamp without time zone' : col.type.replace(/^varchar/, 'character varying').replace(/, /g, ',');
      assert.equal(physical.type, type, `${table.name}.${col.name} type`);
      assert.equal(physical.not_null, col.notNull, `${table.name}.${col.name} nullability`);
      if (col.type === 'serial') assert.ok(physical.sequence, `${table.name}.${col.name} sequence owner`);
      else assert.equal(normalize(physical.default_value), normalize(col.default ?? null), `${table.name}.${col.name} default`);
    }
    assert.equal(columns.length, total);
    for (const value of Object.values(baseline.enums) as any[]) {
      const actual = (await f.db.query('SELECT enumlabel FROM pg_enum WHERE enumtypid=$1::regtype ORDER BY enumsortorder', [value.name])).rows;
      assert.deepEqual(actual.map(row => row.enumlabel), value.values);
    }
    for (const table of Object.values(baseline.tables) as any[]) {
      const actual = (await f.db.query('SELECT conname,contype,confdeltype FROM pg_constraint WHERE conrelid=$1::regclass', [`public.${table.name}`])).rows;
      assert.ok(actual.some(row => row.contype === 'p' && row.conname === `${table.name}_pkey`));
      assert.equal(actual.length, 1 + Object.keys(table.foreignKeys).length + Object.keys(table.uniqueConstraints).length, table.name);
      for (const fk of Object.values(table.foreignKeys) as any[]) assert.ok(actual.some(row => row.conname === fk.name && row.contype === 'f' && row.confdeltype === (fk.onDelete === 'cascade' ? 'c' : fk.onDelete === 'set null' ? 'n' : 'a')), fk.name);
      for (const unique of Object.values(table.uniqueConstraints) as any[]) assert.ok(actual.some(row => row.conname === unique.name && row.contype === 'u'), unique.name);
    }
  } finally { await f.cleanup(); }
});

test('Access migration preserves business rows, IDs, sequences, legacy grants and old constraint definitions', async () => {
  const f = await accessFixture(true);
  try {
    await f.db.query(`INSERT INTO users(username,password_hash,role) VALUES ('fake_old','fake_hash_not_live','zero_grants');
      INSERT INTO permissions(key,label) VALUES ('unknown_legacy','Legacy definition'),('manage_news','Known baseline definition');
      INSERT INTO role_permissions(role,permission_key) VALUES ('orphan_role','unknown_legacy'),('orphan_role','unknown_legacy'),('mapping_only','absent_key'),('orphan_role','manage_news'),('orphan_role','manage_news'),('orphan_role','manage_home');
      INSERT INTO pharmacists(name,registration_id) VALUES ('Fake roster','FAKE-1');
      INSERT INTO products(name,category,price) VALUES ('Fake product','fake',12.34);
      INSERT INTO web_settings DEFAULT VALUES;
      INSERT INTO academy_categories(name) VALUES ('Fake category');
      INSERT INTO academy_courses(title,category_id) VALUES ('Fake course',1);
      INSERT INTO academy_enrollments(pharmacist_license,course_id) VALUES ('FAKE-1',1);
      INSERT INTO academy_certificates(enrollment_id,code) VALUES (1,'FAKE-CERT');`);
    const tables = ['users','permissions','role_permissions','pharmacists','products','web_settings','academy_categories','academy_courses','academy_enrollments','academy_certificates'];
    async function preservedState() {
      const data: Record<string, unknown> = {};
      for (const name of tables) {
        const rows = (await f.db.query(`SELECT * FROM "${name}" ORDER BY id`)).rows;
        if (name === 'users') for (const row of rows) delete row.active;
        if (name === 'role_permissions') for (const row of rows) delete row.is_active;
        data[name] = rows;
        data[`${name}_seq`] = (await f.db.query(`SELECT last_value,is_called FROM "${name}_id_seq"`)).rows;
      }
      data.constraints = (await f.db.query("SELECT conrelid::regclass::text AS table_name,conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='public'::regnamespace AND conrelid NOT IN (COALESCE(to_regclass('roles'),0),COALESCE(to_regclass('staff_sessions'),0),COALESCE(to_regclass('access_audit'),0)) ORDER BY table_name,conname")).rows;
      data.history = (await f.db.query('SELECT hash,created_at FROM drizzle.__drizzle_migrations ORDER BY id LIMIT 8')).rows;
      return data;
    }
    const before = await preservedState();
    await f.migrateAccess();
    assert.deepEqual(await preservedState(), before);
    assert.deepEqual((await f.db.query('SELECT name FROM roles ORDER BY name')).rows.map(row => row.name), ['mapping_only','orphan_role','viewer','zero_grants']);
    assert.deepEqual((await f.db.query('SELECT permission_key,is_active FROM role_permissions ORDER BY id')).rows, [
      { permission_key: 'unknown_legacy', is_active: false }, { permission_key: 'unknown_legacy', is_active: false },
      { permission_key: 'absent_key', is_active: false }, { permission_key: 'manage_news', is_active: true },
      { permission_key: 'manage_news', is_active: true }, { permission_key: 'manage_home', is_active: false },
    ]);
    assert.equal((await f.db.query('SELECT * FROM staff_sessions')).rows.length, 0);
    const history = (await f.db.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY id')).rows;
    assert.equal(history.length, 9);
    await f.migrateAccess();
    assert.deepEqual((await f.db.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY id')).rows, history);
  } finally { await f.cleanup(); }
});
